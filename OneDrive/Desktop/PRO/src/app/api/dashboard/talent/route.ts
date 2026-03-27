import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Application, Milestone, Agreement, Notification, Startup } from '@/lib/models';

export const runtime = 'nodejs';

/**
 * GET /api/dashboard/talent
 * Aggregated talent dashboard data — single call replaces 4+ separate API calls.
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

    if (authResult.user.role !== 'talent') {
      return NextResponse.json({ error: 'Talent role required' }, { status: 403 });
    }

    await connectDB();
    const userId = authResult.user.userId;

    // Parallel queries
    const [applications, agreements, notifications, user] = await Promise.all([
      Application.find({ talentId: userId }).populate('startupId', 'name logo industry stage').sort({ createdAt: -1 }).lean(),
      Agreement.find({ 'parties.userId': userId }).sort({ createdAt: -1 }).lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      User.findById(userId).select('skills verificationLevel').lean(),
    ]);

    const pendingApps = applications.filter((a: any) => a.status === 'pending');
    const acceptedApps = applications.filter((a: any) => a.status === 'accepted');
    const pendingAgreements = agreements.filter((a: any) => a.status === 'pending');

    let milestoneList: any[] = [];
    let matchingStartups: any[] = [];

    if (acceptedApps.length > 0) {
      const startupId = acceptedApps[0].startupId?._id;
      if (startupId) {
        milestoneList = await Milestone.find({ startupId }).lean();
      }
    } else {
      // Fetch matching startups for non-hired talent
      matchingStartups = await Startup.find({ status: { $ne: 'closed' } })
        .select('name logo industry stage rolesNeeded')
        .limit(5)
        .lean();
    }

    // Calculate earnings from completed milestones
    const totalEarnings = milestoneList
      .filter((m: any) => m.status === 'completed')
      .reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
    const pendingEarnings = milestoneList
      .filter((m: any) => m.status === 'completed' && m.paymentStatus !== 'paid')
      .reduce((sum: number, m: any) => sum + (m.amount || 0), 0);

    // Activities from notifications
    const activities = notifications.map((n: any) => ({
      id: n._id,
      title: n.title || 'Activity',
      date: n.createdAt,
    }));

    return NextResponse.json({
      applications,
      milestones: milestoneList,
      matchingStartups,
      startupActivities: activities,
      agreements,
      stats: {
        totalApplications: applications.length,
        pendingApplications: pendingApps.length,
        acceptedApplications: acceptedApps.length,
        activeMilestones: milestoneList.filter((m: any) => m.status === 'in_progress').length,
        completedMilestones: milestoneList.filter((m: any) => m.status === 'completed').length,
        totalMilestones: milestoneList.length,
        totalEarnings,
        pendingEarnings,
        pendingAgreements: pendingAgreements.length,
      },
    });
  } catch (error) {
    console.error('Talent Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
