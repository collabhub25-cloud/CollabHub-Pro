import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { FundingRound, Startup } from '@/lib/models';

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        await connectDB();

        // Find all funding rounds where this user invested
        const investments = await FundingRound.find({
            'investors.userId': userId,
        })
            .populate('startupId', 'name industry stage logo isActive')
            .lean();

        let totalInvested = 0;
        let totalEquity = 0;
        let activeRounds = 0;
        const portfolio: Array<{
            startup: any;
            amount: number;
            equity: number;
            investedAt: string;
            roundType: string;
        }> = [];

        for (const round of investments) {
            const investor = (round as any).investors?.find(
                (inv: any) => inv.userId?.toString() === userId
            );
            if (investor) {
                totalInvested += investor.amount || 0;
                totalEquity += investor.equity || 0;
                if ((round as any).status === 'open') activeRounds++;

                portfolio.push({
                    startup: (round as any).startupId,
                    amount: investor.amount || 0,
                    equity: investor.equity || 0,
                    investedAt: investor.investedAt || (round as any).createdAt,
                    roundType: (round as any).roundType || 'unknown',
                });
            }
        }

        const averageEquity = portfolio.length > 0 ? totalEquity / portfolio.length : 0;

        return NextResponse.json({
            success: true,
            totalInvested,
            averageEquity: Math.round(averageEquity * 100) / 100,
            activeRounds,
            portfolio,
        });
    } catch (error) {
        console.error('Investments Fetch Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
