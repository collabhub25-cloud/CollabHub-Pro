import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Pitch, Startup, User, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'founder') {
      return NextResponse.json({ error: 'Only founders can send pitches' }, { status: 403 });
    }

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);
    const { investorId, startupId, title, pitchDeckUrl, description, fundingAsk, equityOffered } = body;

    if (!investorId || !startupId || !title || !pitchDeckUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify startup exists and belongs to founder
    const startup = await Startup.findById(startupId);
    if (!startup || startup.founderId.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Startup not found or unauthorized' }, { status: 404 });
    }

    // Verify investor exists
    const investor = await User.findById(investorId);
    if (!investor || investor.role !== 'investor') {
      return NextResponse.json({ error: 'Invalid investor' }, { status: 400 });
    }

    // Check for existing pending pitches to this investor from this startup
    const existing = await Pitch.findOne({
      startupId,
      investorId,
      pitchStatus: { $in: ['pending', 'viewed', 'interested'] },
    });

    if (existing) {
      return NextResponse.json({ error: 'An active pitch already exists for this investor.' }, { status: 400 });
    }

    // Create pitch
    const pitch = await Pitch.create({
      startupId,
      investorId,
      founderId: user._id,
      pitchStatus: 'pending',
      title,
      description,
      pitchDocumentUrl: pitchDeckUrl,
      amountRequested: fundingAsk || 0,
      equityOffered: equityOffered || 0,
      pitchSentAt: new Date()
    });

    // Notify investor
    await Notification.create({
      userId: investorId,
      type: 'pitch_received',
      title: 'New Pitch Received!',
      message: `${startup.name} has sent you a pitch titled "${title}"`,
      actionUrl: '/dashboard/investor',
      metadata: {
        pitchId: pitch._id.toString(),
        startupId: startup._id.toString(),
        startupName: startup.name,
      },
    });

    return NextResponse.json({
      success: true,
      pitch,
    });
  } catch (error) {
    console.error('Send Pitch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
