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
            .populate('founderId', 'name email role avatar trustScore verificationLevel')
            .populate('team', 'name email role avatar trustScore')
            .lean();

        if (!startup) {
            return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
        }

        // Fetch related funding rounds
        const fundingRounds = await FundingRound.find({ startupId: id })
            .sort({ createdAt: -1 })
            .lean();

        // Fetch related agreements count
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
