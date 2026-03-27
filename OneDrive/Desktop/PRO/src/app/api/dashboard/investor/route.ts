import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Startup, FundingRound, Alliance, Notification } from '@/lib/models';

export const runtime = 'nodejs';

/**
 * GET /api/dashboard/investor
 * Aggregated investor dashboard data — single call replaces 3+ separate API calls.
 */
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

    // Parallel queries
    const [startups, alliances, notifications, fundingRounds] = await Promise.all([
      Startup.find({ status: { $ne: 'closed' } })
        .select('name logo industry stage vision founderId isActive')
        .populate('founderId', 'name verificationLevel')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Alliance.find({
        $or: [{ requesterId: userId }, { receiverId: userId }],
      })
        .populate('requesterId', 'name avatar')
        .populate('receiverId', 'name avatar')
        .sort({ createdAt: -1 })
        .lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      FundingRound.find({ 'investors.userId': userId })
        .populate('startupId', 'name logo industry stage')
        .lean(),
    ]);

    // Calculate portfolio from real investment data
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

    // Format alliances for activity feed
    const allianceActivities = alliances.slice(0, 3).map((a: any) => {
      const otherUser = a.requesterId?._id?.toString() === userId ? a.receiverId : a.requesterId;
      return {
        label: `Connected with ${otherUser?.name || 'User'}`,
        color: 'bg-blue-500',
      };
    });

    // Investment activities
    const investmentActivities = portfolio.slice(0, 2).map((p: any) => ({
      label: `Invested in ${p.startup?.name || 'startup'}`,
      color: 'bg-green-500',
    }));

    return NextResponse.json({
      portfolio,
      dealflow: startups,
      alliances,
      recentActivity: [...investmentActivities, ...allianceActivities].slice(0, 4),
      notifications,
      stats: {
        totalInvested,
        portfolioCount,
        dealflowCount: startups.length,
        watchlistCount: 0,
        alliancesCount: alliances.length,
        avgTicketSize,
      },
    });
  } catch (error) {
    console.error('Investor Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
