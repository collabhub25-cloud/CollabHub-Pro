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
        const { verificationId, notes } = await request.json();

        if (!verificationId) {
            return NextResponse.json({ error: 'Verification ID required' }, { status: 400 });
        }

        const verification = await Verification.findById(verificationId);
        if (!verification) {
            return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
        }

        if (verification.status !== 'submitted' && verification.status !== 'under_review') {
            return NextResponse.json({ error: 'Verification is not pending review' }, { status: 400 });
        }

        // Mark verification approved
        verification.status = 'approved';
        verification.notes = notes;
        verification.reviewedBy = authResult.user.userId;
        verification.reviewedAt = new Date();
        await verification.save();

        // Cascading upgrade to the User
        const user = await User.findById(verification.userId);
        if (user) {
            user.kycStatus = 'verified';
            user.kycLevel = verification.level;
            user.kycVerifiedAt = new Date();
            user.kycVerifiedBy = authResult.user.userId;

            // Automatic Trust Score boost
            user.trustScore = Math.min(100, (user.trustScore || 50) + 20);
            user.verificationLevel = Math.max(user.verificationLevel, verification.level);

            await user.save();
        }

        return NextResponse.json({ success: true, message: 'KYC Document Approved', data: verification });
    } catch (error) {
        console.error('Admin KYC Approve Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
