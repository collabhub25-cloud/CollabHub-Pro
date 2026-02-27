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

        const { userId } = authResult.user;

        await connectDB();
        const { agreementId, reason } = await request.json();

        if (!agreementId || !reason) {
            return NextResponse.json({ error: 'Agreement ID and dispute reason are required' }, { status: 400 });
        }

        const agreement = await Agreement.findById(agreementId);
        if (!agreement) {
            return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
        }

        if (!agreement.parties.some((partyId: any) => partyId.toString() === userId)) {
            return NextResponse.json({ error: 'You are not a party to this agreement' }, { status: 403 });
        }

        if (agreement.status !== 'active' && agreement.status !== 'signed') {
            return NextResponse.json({ error: 'Only active or fully signed agreements can be disputed' }, { status: 400 });
        }

        agreement.status = 'disputed';
        agreement.auditLog.push({
            action: 'disputed',
            userId,
            timestamp: new Date(),
            metadata: { reason }
        });

        await agreement.save();

        return NextResponse.json({
            success: true,
            message: 'Agreement has been marked as disputed. Our legal team will review the audit logs.',
            data: agreement
        });
    } catch (error) {
        console.error('Agreement Dispute Error:', error);
        return NextResponse.json({ error: 'Internal server error while disputing agreement' }, { status: 500 });
    }
}
