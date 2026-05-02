import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Pitch, User } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'investor') {
      return NextResponse.json({ error: 'Only investors can view received pitches' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    // Get all pitches sent directly to this investor
    // We filter by 'pending', 'viewed', 'interested', 'rejected'
    const pitches = await Pitch.find({
      investorId: user._id,
      pitchStatus: { $in: ['requested', 'sent', 'pending', 'viewed', 'interested', 'rejected'] }
    })
      .populate('startupId', 'name logo industry stage fundingStage')
      .populate('founderId', 'name avatar verificationLevel')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Pitch.countDocuments({
      investorId: user._id,
      pitchStatus: { $in: ['requested', 'sent', 'pending', 'viewed', 'interested', 'rejected'] }
    });

    return NextResponse.json({ success: true, pitches, total, page, limit });

  } catch (error) {
    console.error('Fetch Received Pitches Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
