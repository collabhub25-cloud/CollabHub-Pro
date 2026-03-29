import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Pitch, Startup, User, TeamMember, AccessRequest } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

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
      if (!startupId) {
        return NextResponse.json({ error: 'Startup ID required for founders' }, { status: 400 });
      }
      // Check if user is founder of this startup
      const startup = await Startup.findById(startupId);
      if (!startup || startup.founderId.toString() !== user._id.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const pitches = await Pitch.find({ startupId })
        .populate('investorId', 'name avatar email')
        .sort({ createdAt: -1 });
      return NextResponse.json({ success: true, pitches });
    } else if (user.role === 'investor') {
      const pitches = await Pitch.find({ investorId: user._id })
        .populate('startupId', 'name logo industry stage fundingStage')
        .sort({ createdAt: -1 });
      return NextResponse.json({ success: true, pitches });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('Fetch Pitches Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { startupId, investorId, amountRequested, equityOffered, message } = body;

    // Check auth -> Founder only
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'founder') {
      return NextResponse.json({ error: 'Only founders can pitch' }, { status: 403 });
    }

    // Verify startup ownership
    const startup = await Startup.findById(startupId);
    if (!startup || startup.founderId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Not authorized for this startup' }, { status: 403 });
    }

    // Ensure investor exists
    const investor = await User.findById(investorId);
    if (!investor || investor.role !== 'investor') {
      return NextResponse.json({ error: 'Target must be an investor' }, { status: 400 });
    }

    // Check existing pitch
    const existing = await Pitch.findOne({ startupId, investorId });
    if (existing) {
      if (existing.pitchStatus === 'rejected') {
         return NextResponse.json({ error: 'Investor already rejected your pitch previously' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Already pitched to this investor' }, { status: 400 });
    }

    // ENFORCE ACCESS CONTROL: Verify investor requested access and founder approved
    const accessReq = await AccessRequest.findOne({ startupId, investorId, status: 'approved' });
    if (!accessReq) {
      return NextResponse.json({ error: 'Pitch not allowed. Investor must request access and be approved first.' }, { status: 403 });
    }

    const pitch = await Pitch.create({
      startupId,
      investorId,
      pitchStatus: 'pending',
      amountRequested,
      equityOffered,
      message,
    });

    return NextResponse.json({ success: true, pitch });
  } catch (error) {
    console.error('Create Pitch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, status } = body; // status = 'accepted' | 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const pitch = await Pitch.findById(id);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    // Only target investor can accept/reject
    if (pitch.investorId.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    pitch.pitchStatus = status;
    await pitch.save();

    return NextResponse.json({ success: true, pitch });
  } catch (error) {
    console.error('Update Pitch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
