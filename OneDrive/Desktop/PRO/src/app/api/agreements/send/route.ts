import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Agreement } from '@/lib/models';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();
        const { agreementId } = await request.json();

        if (!agreementId) {
            return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
        }

        const agreement = await Agreement.findById(agreementId);
        if (!agreement) {
            return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
        }

        // Only the initiating party (assumed to be the first in parties array) can SEND it
        if (agreement.parties[0].toString() !== authResult.user.userId) {
            return NextResponse.json({ error: 'Only the agreement creator can send it for signature' }, { status: 403 });
        }

        if (agreement.status !== 'draft') {
            return NextResponse.json({ error: 'Agreement has already been sent or signed' }, { status: 400 });
        }

        agreement.status = 'sent';
        agreement.auditLog.push({
            action: 'sent_for_signature',
            userId: authResult.user.userId,
            timestamp: new Date()
        });

        await agreement.save();

        return NextResponse.json({
            success: true,
            message: 'Agreement sent successfully',
            data: agreement
        });
    } catch (error) {
        console.error('Agreement Send Error:', error);
        return NextResponse.json({ error: 'Internal server error while sending agreement' }, { status: 500 });
    }
}
