import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Milestone, Startup, UserRole } from '@/lib/models';
import { uploadDocument } from '@/lib/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId, role } = authResult.user;

        // Only Founders are paying Milestones in this architecture (to Talent/Investors)
        if (role !== 'founder') {
            return NextResponse.json({ error: 'Only founders can mark milestones as paid.' }, { status: 403 });
        }

        await connectDB();

        const formData = await request.formData();
        const milestoneId = formData.get('milestoneId') as string;
        const paymentMethod = formData.get('paymentMethod') as string;
        const transactionReference = formData.get('transactionReference') as string;
        const file = formData.get('proof') as File | null;

        if (!milestoneId || !paymentMethod) {
            return NextResponse.json({ error: 'Milestone ID and payment method are required' }, { status: 400 });
        }

        if (file && !ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type for payment proof. PNG, JPG, or PDF only.' }, { status: 400 });
        }

        if (file && file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Proof file size exceeds 5MB limit.' }, { status: 400 });
        }

        const milestone = await Milestone.findById(milestoneId);
        if (!milestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        const startup = await Startup.findById(milestone.startupId);
        if (!startup || startup.founderId.toString() !== userId) {
            return NextResponse.json({ error: 'You do not own the startup associated with this milestone' }, { status: 403 });
        }

        if (milestone.paymentStatus === 'confirmed') {
            return NextResponse.json({ error: 'This payment has already been confirmed by the recipient' }, { status: 400 });
        }

        let proofUrl: string | undefined = undefined;
        if (file) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const s3Path = `payments/proofs/${milestoneId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            proofUrl = await uploadDocument(buffer, s3Path, file.type);
        }

        milestone.paymentStatus = 'marked_paid';
        milestone.paymentMethod = paymentMethod;
        milestone.transactionReference = transactionReference || undefined;
        milestone.paymentProofUrl = proofUrl as string | undefined;
        milestone.paidAt = new Date();

        // Status advances if talent hadn't turned it in
        if (milestone.status === 'pending' || milestone.status === 'in_progress') {
            milestone.status = 'completed';
        }

        await milestone.save();

        return NextResponse.json({
            success: true,
            message: 'Milestone marked as paid. Recipient must now confirm receipt.',
            data: milestone,
        });
    } catch (error) {
        console.error('Payment Mark-Paid Error:', error);
        return NextResponse.json({ error: 'Internal server error while marking paid' }, { status: 500 });
    }
}
