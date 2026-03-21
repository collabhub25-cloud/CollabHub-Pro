import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Message, Conversation } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';

// Helper to generate conversation ID between two users
function generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

// GET /api/messages/conversation/[userId] - Get messages with a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherUserId } = await params;
    const token = extractTokenFromCookies(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const generatedConversationId = generateConversationId(decoded.userId, otherUserId);

    // Look up the actual Conversation to get its _id (which is what /api/messages/create stores)
    const conversation = await Conversation.findOne({
      participants: { $all: [decoded.userId, otherUserId] },
    }).lean();

    // Query messages by both possible conversationId formats to find all messages
    const conversationIds: string[] = [generatedConversationId];
    if (conversation) {
      conversationIds.push(conversation._id.toString());
    }

    // Cursor-based pagination
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    const limit = 20;

    const query: Record<string, unknown> = {
      conversationId: { $in: conversationIds }
    };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    // Get messages (newest first for pagination, reverse for display)
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;
    const paginatedMessages = messages.slice(0, limit).reverse();
    const nextCursor = hasMore ? messages[limit]?.createdAt?.toISOString() : null;

    // Get other user details
    const otherUser = await User.findById(otherUserId)
      .select('name avatar role verificationLevel')
      .lean();

    // Mark messages as read
    await Message.updateMany(
      { conversationId: { $in: conversationIds }, receiverId: decoded.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Update unread count in conversation - use participants query instead of _id
    await Conversation.findOneAndUpdate(
      { participants: { $all: [decoded.userId, otherUserId] } },
      { $set: { [`unreadCount.${decoded.userId}`]: 0 } }
    );

    return NextResponse.json({
      conversationId: conversation?._id?.toString() || generatedConversationId,
      nextCursor,
      otherUser: otherUser ? {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar,
        role: otherUser.role,

      } : null,
      messages: paginatedMessages.map(m => ({
        _id: m._id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        read: m.read,
        createdAt: m.createdAt,
        isMine: m.senderId.toString() === decoded.userId,
      })),
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
