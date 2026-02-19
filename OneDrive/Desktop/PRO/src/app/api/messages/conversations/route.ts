import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Conversation } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

// GET /api/messages/conversations - Get all conversations for current user
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Find all conversations where user is a participant
    const conversations = await Conversation.find({
      participants: { $all: [decoded.userId] },
    })
      .sort({ lastMessageAt: -1 })
      .lean();

    // Get participant details
    const participantIds = conversations.flatMap(c => c.participants);
    const participants = await User.find({ _id: { $in: participantIds } })
      .select('name avatar role trustScore verificationLevel')
      .lean();

    const participantMap = new Map(participants.map(p => [p._id.toString(), p]));

    // Format conversations
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        (p: mongoose.Types.ObjectId) => p.toString() !== decoded.userId
      );
      const otherUser = participantMap.get(otherParticipant?.toString() || '');
      
      return {
        _id: conv._id,
        participants: conv.participants,
        otherUser: otherUser ? {
          _id: otherUser._id,
          name: otherUser.name,
          avatar: otherUser.avatar,
          role: otherUser.role,
          trustScore: otherUser.trustScore,
          verificationLevel: otherUser.verificationLevel,
        } : null,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount?.[decoded.userId] || 0,
      };
    });

    return NextResponse.json({
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
