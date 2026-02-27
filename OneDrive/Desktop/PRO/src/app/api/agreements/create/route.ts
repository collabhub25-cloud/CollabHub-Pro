import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Agreement, Startup, User } from '@/lib/models';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId, role } = authResult.user;

        // Only Founders and Investors can instantiate an agreement on CollabHub
        if (role !== 'founder' && role !== 'investor') {
            return NextResponse.json({ error: 'Only founders and investors can draft agreements' }, { status: 403 });
        }

        await connectDB();

        const body = await request.json();
        const { type, startupId, targetUserId, terms, content } = body;

        if (!type || !startupId || !targetUserId || !content) {
            return NextResponse.json({ error: 'Missing required agreement configuration fields' }, { status: 400 });
        }

        // Verify relations
        const startup = await Startup.findById(startupId);
        if (!startup) {
            return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
        }

        // Ensure the founder owns the startup they are drafting for
        if (role === 'founder' && startup.founderId.toString() !== userId) {
            return NextResponse.json({ error: 'You do not own this startup' }, { status: 403 });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
        }

        const newAgreement = await Agreement.create({
            type,
            startupId,
            parties: [userId, targetUserId], // initiator and target
            terms: terms || {},
            content,
            status: 'draft',
            version: 1,
            signedBy: [],
            auditLog: [{
                action: 'drafted',
                userId,
                timestamp: new Date(),
                metadata: { type }
            }]
        });

        return NextResponse.json({
            success: true,
            message: 'Agreement drafted successfully',
            data: newAgreement
        });
    } catch (error) {
        console.error('Agreement Create Error:', error);
        return NextResponse.json({ error: 'Internal server error while drafting agreement' }, { status: 500 });
    }
}
