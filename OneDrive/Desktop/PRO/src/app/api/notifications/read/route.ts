import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Notification } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';

// PATCH /api/notifications/read - Mark notifications as read
export async function PATCH(request: NextRequest) {
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
    const { notificationIds, markAll } = body;

    if (markAll) {
      await Notification.updateMany(
        { userId: decoded.userId, read: false },
        { read: true }
      );
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: decoded.userId },
        { read: true }
      );
    } else {
      return NextResponse.json(
        { error: 'Provide notificationIds or markAll flag' },
        { status: 400 }
      );
    }

    const unreadCount = await Notification.countDocuments({
      userId: decoded.userId,
      read: false,
    });

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
