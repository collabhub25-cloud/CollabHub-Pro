import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Message, Conversation, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { validateInput, SendMessageSchema } from '@/lib/validation/schemas';

// Helper to generate conversation ID between two users
function generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

// POST /api/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, 'message');
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.message);
    
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.message.message);
    }

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
    const validation = validateInput(SendMessageSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { receiverId, content } = validation.data;

    if (receiverId === decoded.userId) {
      return NextResponse.json(
        { error: 'Cannot send message to yourself' },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    const conversationId = generateConversationId(decoded.userId, receiverId);

    // Create message
    const message = await Message.create({
      senderId: decoded.userId,
      receiverId,
      conversationId,
      content: content.trim(),
    });

    // Update or create conversation - use participants array for lookup
    const existingConversation = await Conversation.findOne({
      participants: { $all: [decoded.userId, receiverId] }
    });

    if (existingConversation) {
      existingConversation.lastMessage = content.trim().substring(0, 100);
      existingConversation.lastMessageAt = new Date();
      const unreadKey = `unreadCount.${receiverId}`;
      (existingConversation.unreadCount as Record<string, number>)[receiverId] = 
        ((existingConversation.unreadCount as Record<string, number>)[receiverId] || 0) + 1;
      await existingConversation.save();
    } else {
      await Conversation.create({
        participants: [decoded.userId, receiverId],
        lastMessage: content.trim().substring(0, 100),
        lastMessageAt: new Date(),
        unreadCount: { [receiverId]: 1 },
      });
    }

    // Create notification for receiver
    await Notification.create({
      userId: receiverId,
      type: 'message_received',
      title: 'New Message',
      message: `You have a new message from ${decoded.email}`,
      metadata: { senderId: decoded.userId, messageId: message._id },
    });

    return NextResponse.json({
      success: true,
      message: {
        _id: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
