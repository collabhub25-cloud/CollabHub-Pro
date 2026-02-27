import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Verification, User } from '@/lib/models';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();
        const { verificationId, notes, rejectionReason } = await request.json();

        if (!verificationId || !rejectionReason) {
            return NextResponse.json({ error: 'Verification ID and Rejection Reason required' }, { status: 400 });
        }

        const verification = await Verification.findById(verificationId);
        if (!verification) {
            return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
        }

        if (verification.status !== 'submitted' && verification.status !== 'under_review') {
            return NextResponse.json({ error: 'Verification is not pending review' }, { status: 400 });
        }

        // Mark verification rejected
        verification.status = 'rejected';
        verification.rejectionReason = rejectionReason;
        verification.notes = notes;
        verification.reviewedBy = authResult.user.userId;
        verification.reviewedAt = new Date();
        await verification.save();

        // Demote the user's KYC status back so they can re-try
        await User.findByIdAndUpdate(verification.userId, {
            kycStatus: 'rejected',
        });

        return NextResponse.json({ success: true, message: 'KYC Document Rejected', data: verification });
    } catch (error) {
        console.error('Admin KYC Reject Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
