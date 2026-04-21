import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Startup, Application, Milestone, Notification, Pitch } from '@/lib/models';
import { Job } from '@/lib/models/job.model';
import Achievement from '@/lib/models/achievement.model';
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { perfTracker } from '@/lib/perf-analytics';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const start = Date.now();
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

    const userId = authResult.user.userId;
    const cacheKey = CACHE_KEYS.dashboardStats(userId, 'founder');

    // Cache-aside: serve from cache if fresh (30s TTL)
    const data = await cacheOrFetch(cacheKey, async () => {
      await connectDB();

      const [startups, notifications] = await Promise.all([
        Startup.find({ founderId: userId, isActive: true }).populate('team', 'name email avatar skills').lean(),
        Notification.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      ]);

      const startup = startups[0] || null;
      const startupIds = startups.map((s: any) => s._id);
      let applications: any[] = [];
      let milestonesList: any[] = [];
      let pitchesList: any[] = [];
      let achievementsList: any[] = [];
      let activeJobsCount = 0;

      if (startupIds.length > 0) {
        [applications, milestonesList, pitchesList, achievementsList, activeJobsCount] = await Promise.all([
          Application.find({ startupId: { $in: startupIds } })
            .populate('talentId', 'name email avatar skills verificationLevel bio location')
            .sort({ createdAt: -1 }).limit(10).lean(),
          Milestone.find({ startupId: { $in: startupIds } }).lean(),
          Pitch.find({ startupId: { $in: startupIds } })
            .populate('investorId', 'name avatar email verificationLevel')
            .lean(),
          Achievement.find({ startupId: { $in: startupIds } }).sort({ createdAt: -1 }).lean(),
          Job.countDocuments({ startupId: { $in: startupIds }, isActive: true }),
        ]);
      }

      const pendingApps = applications.filter((a: any) => a.status === 'pending');
      const pendingMilestones = milestonesList.filter((m: any) => m.status !== 'completed' && m.status !== 'cancelled');
      const pendingPitchRequests = pitchesList.filter((p: any) => p.pitchStatus === 'requested');
      const totalPitchesReceived = pitchesList.length;
      const pitchesSent = pitchesList.filter((p: any) => p.pitchStatus === 'sent').length;
      const pitchesInvested = pitchesList.filter((p: any) => p.pitchStatus === 'invested').length;
      const totalTeam = startups.reduce((sum: number, s: any) => sum + (s.team?.length || 0), 0);

      const activities = notifications.slice(0, 6).map((notif: any) => ({
        id: notif._id,
        type: notif.type,
        title: notif.title || 'Notification',
        description: notif.message || '',
        date: notif.createdAt,
      }));

      return {
        startup,
        applications,
        activities,
        milestones: milestonesList,
        pitches: pitchesList,
        achievements: achievementsList,
        stats: {
          pendingApplications: pendingApps.length,
          pendingMilestones: pendingMilestones.length,
          pendingPitchRequests: pendingPitchRequests.length,
          totalAchievements: achievementsList.length,
          totalTeam,
          startupsCount: startups.length,
          activeJobs: activeJobsCount,
          totalPitchesReceived,
          pitchesSent,
          pitchesInvested,
        },
      };
    }, CACHE_TTL.SHORT);

    const duration = Date.now() - start;
    perfTracker.recordResponse('GET /api/dashboard/founder', duration);

    const response = NextResponse.json(data);
    response.headers.set('X-Response-Time', `${duration}ms`);
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    const duration = Date.now() - start;
    perfTracker.recordResponse('GET /api/dashboard/founder', duration, true);
    console.error('Founder Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
