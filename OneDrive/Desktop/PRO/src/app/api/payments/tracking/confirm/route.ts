import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Milestone } from '@/lib/models';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId } = authResult.user;

        await connectDB();
        const { milestoneId } = await request.json();

        if (!milestoneId) {
            return NextResponse.json({ error: 'Milestone ID required' }, { status: 400 });
        }

        const milestone = await Milestone.findById(milestoneId);
        if (!milestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        if (milestone.assignedTo.toString() !== userId) {
            return NextResponse.json({ error: 'You are not assigned to this milestone' }, { status: 403 });
        }

        if (milestone.paymentStatus !== 'marked_paid') {
            return NextResponse.json({ error: 'Payment has not been marked as paid by the founder yet' }, { status: 400 });
        }

        milestone.paymentStatus = 'confirmed';
        milestone.confirmedAt = new Date();
        milestone.status = 'completed'; // Sync total status

        await milestone.save();

        return NextResponse.json({
            success: true,
            message: 'Payment tracking confirmed successfully',
            data: milestone,
        });
    } catch (error) {
        console.error('Payment Confirm Error:', error);
        return NextResponse.json({ error: 'Internal server error while confirming payment' }, { status: 500 });
    }
}
