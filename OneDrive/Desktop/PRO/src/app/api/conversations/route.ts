import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Conversation, Message } from '@/lib/models';

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId } = authResult.user;

        await connectDB();

        // Fetch pagination metadata
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const conversations = await Conversation.find({ participants: userId })
            .sort({ lastMessageAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('participants', 'name avatar role');

        const total = await Conversation.countDocuments({ participants: userId });

        return NextResponse.json({
            success: true,
            data: conversations,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Fetch Conversations Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
