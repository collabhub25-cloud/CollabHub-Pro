import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Startup, User, FundingRound, Agreement } from '@/lib/models';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        const startup = await Startup.findById(id)
            .populate('founderId', 'name email role avatar verificationLevel')
            .populate('team', 'name email role avatar')
            .lean();

        if (!startup) {
            return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
        }

        const fundingRounds = await FundingRound.find({ startupId: id })
            .sort({ createdAt: -1 })
            .lean();

        const agreementCount = await Agreement.countDocuments({ startupId: id });

        return NextResponse.json({
            success: true,
            startup,
            fundingRounds,
            agreementCount,
        });
    } catch (error) {
        console.error('Startup Fetch Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        const startup = await Startup.findById(id);
        if (!startup) {
            return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
        }

        if (startup.founderId.toString() !== authResult.user.userId) {
            return NextResponse.json({ error: 'Not authorized to edit this startup' }, { status: 403 });
        }

        const body = await request.json();

        const allowedFields = [
            'name', 'vision', 'description', 'stage', 'industry',
            'fundingStage', 'fundingAmount', 'website', 'logo', 'isActive'
        ];

        const updates: Record<string, any> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updated = await Startup.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        return NextResponse.json({ success: true, startup: updated });
    } catch (error) {
        console.error('Startup Update Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
