import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Message, Conversation, User } from '@/lib/models';
import { uploadDocument, generateSecureDownloadUrl } from '@/lib/storage';
import { sanitizeObject, sanitizeString } from '@/lib/security/sanitize';

export async function POST(request: NextRequest) {
    try {
        const rateLimitKey = getRateLimitKey(request, 'message');
        const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.message);

        if (!rateLimitResult.allowed) {
            return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.message.message);
        }

        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId } = authResult.user;

        await connectDB();

        // Support multipart if there are attachments
        const contentType = request.headers.get('content-type') || '';
        let receiverId, content, conversationId;
        let attachments: { url: string; type: string; name: string }[] = [];

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            receiverId = formData.get('receiverId') as string;
            content = sanitizeString((formData.get('content') as string) || '');
            conversationId = formData.get('conversationId') as string;

            const file = formData.get('attachment') as File | null;
            if (file) {
                if (file.size > 5 * 1024 * 1024) throw new Error('Attachment exceeds 5MB limit');
                const buffer = Buffer.from(await file.arrayBuffer());
                const s3Path = `messages/${conversationId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const uploadUrl = await uploadDocument(buffer, s3Path, file.type);
                attachments.push({ url: uploadUrl, type: file.type, name: file.name });
            }
        } else {
            const rawBody = await request.json();
            const body = sanitizeObject(rawBody);
            receiverId = body.receiverId;
            content = body.content;
            conversationId = body.conversationId;
        }

        if (!receiverId || !content) {
            return NextResponse.json({ error: 'Receiver ID and content are required' }, { status: 400 });
        }

        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
        }

        // IDOR & Cross-conversation check
        let conversation;
        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
            }
            if (!conversation.participants.some((p: any) => p.toString() === userId)) {
                return NextResponse.json({ error: 'You are not a participant in this conversation' }, { status: 403 });
            }
        } else {
            // Find or create
            conversation = await Conversation.findOne({
                participants: { $all: [userId, receiverId], $size: 2 }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [userId, receiverId],
                    unreadCount: { [receiverId.toString()]: 0, [userId.toString()]: 0 }
                });
            }
        }

        const message = await Message.create({
            senderId: userId,
            receiverId,
            conversationId: conversation._id.toString(),
            content,
            attachments,
            read: false
        });

        conversation.lastMessage = content;
        conversation.lastMessageAt = new Date();

        // Increment unread count for receiver safely
        const currentUnread = conversation.unreadCount?.[receiverId.toString()] || 0;
        conversation.set(`unreadCount.${receiverId.toString()}`, currentUnread + 1);

        await conversation.save();

        return NextResponse.json({ success: true, data: message });
    } catch (error) {
        console.error('Send Message Error:', error);
        return NextResponse.json({ error: 'Internal server error while sending message' }, { status: 500 });
    }
}
