import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Pitch, Startup, User, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { sanitizeObject } from '@/lib/security/sanitize';

// GET /api/pitches — Fetch pitches for current user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const startupId = searchParams.get('startupId');

    if (user.role === 'founder') {
      // Founder sees pitch requests for their startups
      const query: Record<string, unknown> = {};
      if (startupId) {
        const startup = await Startup.findById(startupId);
        if (!startup || startup.founderId.toString() !== user._id.toString()) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        query.startupId = startupId;
      } else {
        // Get all startups for this founder
        const startups = await Startup.find({ founderId: user._id }).select('_id');
        const startupIds = startups.map(s => s._id);
        query.startupId = { $in: startupIds };
      }

      const pitches = await Pitch.find(query)
        .populate('investorId', 'name avatar email verificationLevel')
        .populate('startupId', 'name logo industry stage fundingStage')
        .sort({ createdAt: -1 });
      return NextResponse.json({ success: true, pitches });

    } else if (user.role === 'investor') {
      const pitches = await Pitch.find({ investorId: user._id })
        .populate('startupId', 'name logo industry stage fundingStage founderId')
        .sort({ createdAt: -1 });
      return NextResponse.json({ success: true, pitches });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('Fetch Pitches Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/pitches — Investor requests a pitch from a startup
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'investor') {
      return NextResponse.json({ error: 'Only investors can request pitches' }, { status: 403 });
    }

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);
    const { startupId, message } = body;

    if (!startupId) {
      return NextResponse.json({ error: 'Startup ID is required' }, { status: 400 });
    }

    // Verify startup exists
    const startup = await Startup.findById(startupId);
    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    // Prevent requesting pitch for own startup
    if (startup.founderId.toString() === payload.userId) {
      return NextResponse.json({ error: 'Cannot request pitch for your own startup' }, { status: 400 });
    }

    // Check for existing active pitch request
    const existing = await Pitch.findOne({
      startupId,
      investorId: user._id,
      pitchStatus: { $in: ['requested', 'sent'] },
    });

    if (existing) {
      return NextResponse.json({
        error: existing.pitchStatus === 'requested'
          ? 'Pitch request already sent'
          : 'Pitch already received from this startup',
      }, { status: 400 });
    }

    // Create pitch request
    const pitch = await Pitch.create({
      startupId,
      investorId: user._id,
      pitchStatus: 'requested',
      message: message?.substring(0, 2000),
    });

    // Notify founder
    await Notification.create({
      userId: startup.founderId,
      type: 'pitch_requested',
      title: 'New Pitch Request',
      message: `${user.name} has requested a pitch for ${startup.name}`,
      actionUrl: '/dashboard/founder',
      metadata: {
        pitchId: pitch._id.toString(),
        investorId: user._id.toString(),
        investorName: user.name,
        startupId: startup._id.toString(),
        startupName: startup.name,
      },
    });

    return NextResponse.json({
      success: true,
      pitch: {
        _id: pitch._id,
        pitchStatus: pitch.pitchStatus,
        createdAt: pitch.createdAt,
      },
    });
  } catch (error) {
    console.error('Request Pitch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/pitches — Founder sends pitch or rejects request
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, action, pitchDocumentUrl, message: pitchMessage } = body;
    // action: 'send_pitch' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: 'Pitch ID and action are required' }, { status: 400 });
    }

    if (!['send_pitch', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use send_pitch or reject' }, { status: 400 });
    }

    const pitch = await Pitch.findById(id);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    // Verify founder owns the startup
    const startup = await Startup.findById(pitch.startupId);
    if (!startup || startup.founderId.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Only the startup founder can respond to pitch requests' }, { status: 403 });
    }

    if (pitch.pitchStatus !== 'requested') {
      return NextResponse.json({ error: `Cannot ${action} — pitch is already ${pitch.pitchStatus}` }, { status: 400 });
    }

    if (action === 'send_pitch') {
      pitch.pitchStatus = 'sent';
      pitch.pitchDocumentUrl = pitchDocumentUrl || undefined;
      pitch.pitchMessage = pitchMessage || undefined;
      pitch.pitchSentAt = new Date();
      await pitch.save();

      // Notify investor
      await Notification.create({
        userId: pitch.investorId,
        type: 'pitch_sent',
        title: 'Pitch Received!',
        message: `${startup.name} has sent you their pitch`,
        actionUrl: '/dashboard/investor',
        metadata: {
          pitchId: pitch._id.toString(),
          startupId: startup._id.toString(),
          startupName: startup.name,
          pitchDocumentUrl: pitchDocumentUrl || null,
        },
      });

      return NextResponse.json({
        success: true,
        pitch,
        message: 'Pitch sent successfully. Investment confirmation will be triggered in 2 hours.',
      });
    }

    if (action === 'reject') {
      pitch.pitchStatus = 'rejected';
      await pitch.save();

      // Notify investor
      await Notification.create({
        userId: pitch.investorId,
        type: 'pitch_requested', // reuse type
        title: 'Pitch Request Declined',
        message: `${startup.name} has declined your pitch request`,
        actionUrl: '/dashboard/investor',
        metadata: {
          pitchId: pitch._id.toString(),
          startupId: startup._id.toString(),
          startupName: startup.name,
        },
      });

      return NextResponse.json({ success: true, pitch });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update Pitch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
