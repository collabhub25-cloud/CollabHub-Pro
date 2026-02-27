import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Milestone, Dispute } from '@/lib/models';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId } = authResult.user;

        await connectDB();
        const { milestoneId, reason } = await request.json();

        if (!milestoneId || !reason) {
            return NextResponse.json({ error: 'Milestone ID and dispute reason are required' }, { status: 400 });
        }

        const milestone = await Milestone.findById(milestoneId);
        if (!milestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        // Only the assigned receiver can dispute a marked_paid transaction if they didn't get funds
        if (milestone.assignedTo.toString() !== userId) {
            return NextResponse.json({ error: 'You are not assigned to this milestone' }, { status: 403 });
        }

        // You can only dispute it BEFORE confirming it
        if (milestone.paymentStatus === 'confirmed') {
            return NextResponse.json({ error: 'Payment has already been confirmed' }, { status: 400 });
        }

        // Update milestone state
        milestone.paymentStatus = 'disputed';
        milestone.status = 'disputed';
        await milestone.save();

        // Create central dispute record for Admins
        const newDispute = await Dispute.create({
            milestoneId,
            raisedBy: userId,
            againstUser: milestone.startupId, // Target the startup/founder logically
            reason,
            status: 'open',
        });

        return NextResponse.json({
            success: true,
            message: 'Payment has been disputed and escalated to Admins',
            data: { milestone, dispute: newDispute },
        });
    } catch (error) {
        console.error('Payment Dispute Error:', error);
        return NextResponse.json({ error: 'Internal server error while disputing payment' }, { status: 500 });
    }
}
