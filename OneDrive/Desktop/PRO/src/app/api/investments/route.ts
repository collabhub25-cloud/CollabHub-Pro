import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { FundingRound, Startup, Investment, TeamMember, Pitch } from '@/lib/models';

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
            'investors.investorId': userId,
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

        // Fetch from new Investment schema
        const directInvestments = await Investment.find({ investorId: userId })
            .populate('startupId', 'name industry stage logo isActive')
            .lean();

        for (const inv of directInvestments) {
            totalInvested += inv.amountInvested || 0;
            totalEquity += inv.equityPercentage || 0;
            if (inv.status === 'active') activeRounds++;

            portfolio.push({
                startup: inv.startupId,
                amount: inv.amountInvested,
                equity: inv.equityPercentage,
                investedAt: inv.investmentDate || inv.createdAt,
                roundType: 'Direct Investment',
            });
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

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (authResult.user.role !== 'founder') {
            return NextResponse.json({ error: 'Only founders can record investments' }, { status: 403 });
        }

        const body = await request.json();
        const { startupId, investorId, amountInvested, equityPercentage, investmentDate, pitchId } = body;

        await connectDB();

        // Ensure user is founder of startup
        const startup = await Startup.findById(startupId);
        if (!startup || startup.founderId.toString() !== authResult.user.userId) {
            return NextResponse.json({ error: 'Not authorized for this startup' }, { status: 403 });
        }

        // Create Investment
        const investment = await Investment.create({
            startupId,
            investorId,
            amountInvested,
            equityPercentage,
            investmentDate: investmentDate || new Date(),
            status: 'active'
        });

        // Add investor to TeamMembers automatically
        await TeamMember.findOneAndUpdate(
            { startupId, userId: investorId },
            { 
               startupId, 
               userId: investorId, 
               role: 'Investor', 
               isFounder: false, 
               equity: equityPercentage, 
               status: 'active',
               joinedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        // If this investment came from a pitch, we could optionally mark it closed
        if (pitchId) {
            await Pitch.findByIdAndUpdate(pitchId, { pitchStatus: 'accepted' }); // Assuming we just ensure its state
        }

        return NextResponse.json({ success: true, investment });
    } catch (error) {
        console.error('Investment Create Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
