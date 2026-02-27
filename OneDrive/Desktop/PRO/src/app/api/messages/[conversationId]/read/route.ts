import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Message, Conversation } from '@/lib/models';

export async function POST(
    request: NextRequest,
    { params }: { params: { conversationId: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId } = authResult.user;
        const conversationId = params.conversationId;

        await connectDB();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (!conversation.participants.some((p: any) => p.toString() === userId)) {
            return NextResponse.json({ error: 'You are not a participant in this conversation' }, { status: 403 });
        }

        // Mark all unread messages received by this user in this conversation as read
        await Message.updateMany(
            { conversationId, receiverId: userId, read: false },
            { $set: { read: true, readAt: new Date() } }
        );

        // Reset conversation unread counter for this user
        conversation.set(`unreadCount.${userId}`, 0);
        await conversation.save();

        return NextResponse.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark Messages Read Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
