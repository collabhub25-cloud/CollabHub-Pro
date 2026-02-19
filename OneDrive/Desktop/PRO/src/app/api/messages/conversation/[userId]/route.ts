import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Message, Conversation } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const conversationId = generateConversationId(decoded.userId, otherUserId);

    // Get messages
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    // Get other user details
    const otherUser = await User.findById(otherUserId)
      .select('name avatar role trustScore verificationLevel')
      .lean();

    // Mark messages as read
    await Message.updateMany(
      { conversationId, receiverId: decoded.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Update unread count in conversation - use participants query instead of _id
    await Conversation.findOneAndUpdate(
      { participants: { $all: [decoded.userId, otherUserId] } },
      { $set: { [`unreadCount.${decoded.userId}`]: 0 } }
    );

    return NextResponse.json({
      conversationId,
      otherUser: otherUser ? {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar,
        role: otherUser.role,
        trustScore: otherUser.trustScore,
        verificationLevel: otherUser.verificationLevel,
      } : null,
      messages: messages.map(m => ({
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
