import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Alliance } from '@/lib/models';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// GET /api/alliances/status - Check alliance status with another user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
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

    if (targetUserId === currentUserId) {
      return NextResponse.json({
        status: 'self',
        alliance: null,
      });
    }

    // Check for existing alliance
    const alliance = await Alliance.findOne({
      $or: [
        { requesterId: currentUserId, receiverId: targetUserId },
        { requesterId: targetUserId, receiverId: currentUserId },
      ],
    }).lean();

    if (!alliance) {
      return NextResponse.json({
        status: 'none',
        alliance: null,
      });
    }

    // Determine the status from current user's perspective
    let status = alliance.status;
    if (alliance.status === 'pending') {
      if (alliance.requesterId.toString() === currentUserId) {
        status = 'pending_sent';
      } else {
        status = 'pending_received';
      }
    }

    return NextResponse.json({
      status,
      alliance: {
        _id: alliance._id.toString(),
        requesterId: alliance.requesterId.toString(),
        receiverId: alliance.receiverId.toString(),
        status: alliance.status,
        createdAt: alliance.createdAt,
        updatedAt: alliance.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error checking alliance status:', error);
    return NextResponse.json(
      { error: 'Failed to check alliance status' },
      { status: 500 }
    );
  }
}
