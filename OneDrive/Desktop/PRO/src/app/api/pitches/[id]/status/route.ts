import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Pitch, User, Notification, Startup } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'investor') {
      return NextResponse.json({ error: 'Only investors can update pitch status' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['viewed', 'interested', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status update' }, { status: 400 });
    }

    const pitch = await Pitch.findById(params.id);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    if (pitch.investorId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    pitch.pitchStatus = status;
    await pitch.save();

    // Fetch startup to get name for notification
    const startup = await Startup.findById(pitch.startupId);
    
    // Notify founder
    if (pitch.founderId) {
        let actionMessage = '';
        let type = '';
        if (status === 'viewed') {
            actionMessage = `${user.name} viewed your pitch for ${startup?.name || 'your startup'}.`;
            type = 'pitch_viewed';
        } else if (status === 'interested') {
            actionMessage = `${user.name} is interested in your pitch for ${startup?.name || 'your startup'}!`;
            type = 'pitch_interested';
        } else if (status === 'rejected') {
            actionMessage = `${user.name} passed on your pitch for ${startup?.name || 'your startup'}.`;
            type = 'pitch_rejected';
        }

        await Notification.create({
            userId: pitch.founderId,
            type: type,
            title: `Pitch Update: ${startup?.name}`,
            message: actionMessage,
            actionUrl: '/dashboard/founder',
            metadata: {
                pitchId: pitch._id.toString(),
                investorId: user._id.toString(),
                status: status
            },
        });
    }

    return NextResponse.json({ success: true, pitch });

  } catch (error) {
    console.error('Update Pitch Status Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
