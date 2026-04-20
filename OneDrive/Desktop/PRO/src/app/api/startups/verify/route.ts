import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Startup } from '@/lib/models/startup.model';

/**
 * POST /api/startups/verify
 * Founder requests verification for their startup.
 * Only the founder of the startup can request verification.
 * Sets verificationStatus from "none" → "pending".
 */
export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { startupId } = await request.json();

        if (!startupId) {
            return NextResponse.json({ error: 'startupId is required' }, { status: 400 });
        }

        await connectDB();

        const startup = await Startup.findById(startupId);
        if (!startup) {
            return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
        }

        // Security: only the startup founder can request verification
        if (startup.founderId.toString() !== authResult.user.userId) {
            return NextResponse.json(
                { error: 'Only the startup founder can request verification' },
                { status: 403 }
            );
        }

        // Guard: cannot re-request if already pending or approved
        if (startup.verificationStatus === 'pending') {
            return NextResponse.json(
                { error: 'Verification request is already pending' },
                { status: 409 }
            );
        }

        if (startup.verificationStatus === 'approved') {
            return NextResponse.json(
                { error: 'Startup is already verified' },
                { status: 409 }
            );
        }

        // Set status to pending
        startup.verificationStatus = 'pending';
        startup.verificationRequestedAt = new Date();
        await startup.save();

        return NextResponse.json({
            success: true,
            message: 'Verification request submitted successfully',
            startup: {
                _id: startup._id,
                name: startup.name,
                verificationStatus: startup.verificationStatus,
                verificationRequestedAt: startup.verificationRequestedAt,
            },
        });
    } catch (error) {
        console.error('Startup verification request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
