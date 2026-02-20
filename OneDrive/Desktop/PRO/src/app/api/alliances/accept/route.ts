import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Alliance, User, Notification, TrustScoreLog } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { validateInput, AllianceActionSchema } from '@/lib/validation/schemas';

// POST /api/alliances/accept - Accept alliance request
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    
    // Zod validation
    const validation = validateInput(AllianceActionSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { allianceId } = validation.data;

    // CRITICAL FIX: Use atomic update to prevent race condition
    // This ensures only one accept can succeed even with concurrent requests
    const alliance = await Alliance.findOneAndUpdate(
      { 
        _id: allianceId, 
        receiverId: decoded.userId,
        status: 'pending' 
      },
      { 
        $set: { status: 'accepted', updatedAt: new Date() } 
      },
      { new: true }
    );

    if (!alliance) {
      // Check if alliance exists at all
      const existingAlliance = await Alliance.findById(allianceId);
      if (!existingAlliance) {
        return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
      }
      if (existingAlliance.receiverId.toString() !== decoded.userId) {
        return NextResponse.json({ error: 'Not authorized to accept this alliance' }, { status: 403 });
      }
      // Alliance exists but is not pending
      return NextResponse.json(
        { error: `Alliance already ${existingAlliance.status}` },
        { status: 400 }
      );
    }

    // Update trust scores for both users (+2 each)
    await User.findByIdAndUpdate(alliance.requesterId, { $inc: { trustScore: 2 } });
    await User.findByIdAndUpdate(alliance.receiverId, { $inc: { trustScore: 2 } });

    // Log trust score changes
    await TrustScoreLog.create([
      {
        userId: alliance.requesterId,
        scoreChange: 2,
        reason: 'Alliance formed with another user',
        category: 'alliance',
      },
      {
        userId: alliance.receiverId,
        scoreChange: 2,
        reason: 'Alliance formed with another user',
        category: 'alliance',
      },
    ]);

    // Get both users' info
    const accepter = await User.findById(decoded.userId).select('name').lean();
    const requester = await User.findById(alliance.requesterId).select('name').lean();

    // Create notification for requester
    const notification = await Notification.create({
      userId: alliance.requesterId,
      type: 'alliance_accepted',
      title: 'Alliance Accepted!',
      message: `${accepter?.name || 'Someone'} accepted your alliance request`,
      actionUrl: '/alliances',
      metadata: {
        allianceId: alliance._id.toString(),
        accepterId: decoded.userId,
        accepterName: accepter?.name,
      },
    });

    return NextResponse.json({
      success: true,
      alliance: {
        _id: alliance._id.toString(),
        status: alliance.status,
        updatedAt: alliance.updatedAt,
      },
      notification,
      trustScoreChange: 2,
    });
  } catch (error) {
    console.error('Error accepting alliance:', error);
    return NextResponse.json(
      { error: 'Failed to accept alliance' },
      { status: 500 }
    );
  }
}
