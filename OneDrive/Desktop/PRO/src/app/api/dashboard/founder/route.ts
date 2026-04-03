import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Startup, Application, Milestone, FundingRound, Notification } from '@/lib/models';

export const runtime = 'nodejs';

/**
 * GET /api/dashboard/founder
 * Aggregated founder dashboard data — single call replaces 7 separate API calls.
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

    if (authResult.user.role !== 'founder') {
      return NextResponse.json({ error: 'Founder role required' }, { status: 403 });
    }

    await connectDB();
    const userId = authResult.user.userId;

    // Parallel queries — all independent
    const [startups, talentUsers, investorUsers, notifications] = await Promise.all([
      Startup.find({ founderId: userId }).lean(),
      User.find({ role: 'talent' }).select('name avatar skills verificationLevel').limit(5).lean(),
      User.find({ role: 'investor' }).select('name avatar verificationLevel').limit(5).lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const startup = startups[0] || null;
    let applications: any[] = [];
    let fundingRounds: any[] = [];
    let milestonesList: any[] = [];

    if (startup?._id) {
      // Sequential queries that depend on startupId
      [applications, fundingRounds, milestonesList] = await Promise.all([
        Application.find({ startupId: startup._id }).populate('talentId', 'name avatar').sort({ createdAt: -1 }).limit(10).lean(),
        FundingRound.find({ startupId: startup._id }).lean(),
        Milestone.find({ startupId: startup._id }).lean(),
      ]);
    }

    const pendingApps = applications.filter((a: any) => a.status === 'pending');
    const totalRaised = fundingRounds.reduce((sum: number, r: any) => sum + (r.raisedAmount || 0), 0);
    const totalTarget = fundingRounds.reduce((sum: number, r: any) => sum + (r.targetAmount || 0), 0);
    const totalExpenditure = milestonesList
      .filter((m: any) => m.status === 'completed')
      .reduce((sum: number, m: any) => sum + (m.amount || 0), 0);

    // Build activity feed from notifications
    const activities = notifications.slice(0, 6).map((notif: any) => ({
      id: notif._id,
      type: notif.type,
      title: notif.title || 'Notification',
      description: notif.message || '',
      date: notif.createdAt,
    }));

    return NextResponse.json({
      startup,
      applications,
      activities,
      talentRecommendations: talentUsers,
      investorRecommendations: investorUsers,
      fundingRounds,
      stats: {
        fundingRaised: totalRaised,
        fundingTarget: totalTarget,
        pendingApplications: pendingApps.length,
        totalExpenditure,
      },
    });
  } catch (error) {
    console.error('Founder Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
