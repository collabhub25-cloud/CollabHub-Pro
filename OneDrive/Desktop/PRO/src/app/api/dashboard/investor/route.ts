import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Startup, FundingRound, Alliance, Notification, Pitch } from '@/lib/models';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(request, 'api');
    const rateLimitResult = checkRateLimit(rateLimitKey, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (authResult.user.role !== 'investor') {
      return NextResponse.json({ error: 'Investor role required' }, { status: 403 });
    }

    await connectDB();
    const userId = authResult.user.userId;

    const [startups, fundingRounds, pitches, activityRes] = await Promise.all([
      Startup.find({ status: { $ne: 'closed' } })
        .select('name logo industry stage vision founderId isActive')
        .populate('founderId', 'name verificationLevel')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      FundingRound.find({ 'investors.userId': userId })
        .populate('startupId', 'name logo industry stage')
        .lean(),
      Pitch.find({ investorId: userId })
        .populate('startupId', 'name logo industry stage fundingStage founderId')
        .sort({ createdAt: -1 })
        .lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const portfolio = fundingRounds.map((round: any) => {
      const investor = round.investors?.find((inv: any) => inv.userId?.toString() === userId);
      return {
        startup: round.startupId,
        amount: investor?.amount || 0,
        equity: investor?.equityAllocated || 0,
        investedAt: investor?.investedAt || round.createdAt,
        roundName: round.roundName,
      };
    });

    const totalInvested = portfolio.reduce((sum: number, p: any) => sum + p.amount, 0);
    const portfolioCount = portfolio.length;
    const avgTicketSize = portfolioCount > 0 ? Math.round(totalInvested / portfolioCount) : 0;

    const pendingPitches = pitches.filter((p: any) => p.pitchStatus === 'pending');

    const activity = activityRes.map((n: any) => ({
      id: n._id,
      title: n.title || 'Activity',
      description: n.message || '',
      date: n.createdAt,
      timestamp: n.createdAt,
    }));

    const response = NextResponse.json({
      portfolio,
      dealflow: startups,
      pitches: pendingPitches,
      alliances: [],
      activity,
      stats: {
        totalInvested,
        portfolioCount,
        dealflowCount: startups.length,
        avgTicketSize,
      },
    });
    
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Investor Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
