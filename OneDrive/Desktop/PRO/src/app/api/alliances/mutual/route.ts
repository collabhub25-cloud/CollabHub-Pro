import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Alliance, User } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

// GET /api/alliances/mutual - Get mutual alliances between users
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const currentUserId = decoded.userId;

    // Get current user's alliances
    const currentUserAlliances = await Alliance.find({
      status: 'accepted',
      $or: [{ requesterId: currentUserId }, { receiverId: currentUserId }],
    }).lean();

    const currentUserPartnerIds = new Set(
      currentUserAlliances.map((a) =>
        a.requesterId.toString() === currentUserId
          ? a.receiverId.toString()
          : a.requesterId.toString()
      )
    );

    // Get target user's alliances
    const targetUserAlliances = await Alliance.find({
      status: 'accepted',
      $or: [{ requesterId: targetUserId }, { receiverId: targetUserId }],
    }).lean();

    const targetUserPartnerIds = targetUserAlliances.map((a) =>
      a.requesterId.toString() === targetUserId
        ? a.receiverId.toString()
        : a.requesterId.toString()
    );

    // Find mutual alliances
    const mutualIds = targetUserPartnerIds.filter((id) => currentUserPartnerIds.has(id));

    // Get mutual users' details
    const mutualUsers = await User.find({
      _id: { $in: mutualIds },
    })
      .select('name email role avatar trustScore verificationLevel')
      .lean();

    return NextResponse.json({
      count: mutualIds.length,
      mutualAlliances: mutualUsers.map((u) => ({
        _id: u._id.toString(),
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        trustScore: u.trustScore,
        verificationLevel: u.verificationLevel,
      })),
    });
  } catch (error) {
    console.error('Error fetching mutual alliances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mutual alliances' },
      { status: 500 }
    );
  }
}
