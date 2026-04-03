import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Startup, Application, Milestone, Notification, Pitch } from '@/lib/models';
import Achievement from '@/lib/models/achievement.model';

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

    if (authResult.user.role !== 'founder') {
      return NextResponse.json({ error: 'Founder role required' }, { status: 403 });
    }

    await connectDB();
    const userId = authResult.user.userId;

    const [startups, notifications] = await Promise.all([
      Startup.find({ founderId: userId }).populate('team', 'name email avatar skills').lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const startup = startups[0] || null;
    let applications: any[] = [];
    let milestonesList: any[] = [];
    let pitchesList: any[] = [];
    let achievementsList: any[] = [];

    if (startup?._id) {
      [applications, milestonesList, pitchesList, achievementsList] = await Promise.all([
        Application.find({ startupId: startup._id })
          .populate('talentId', 'name email avatar skills verificationLevel bio location')
          .sort({ createdAt: -1 }).limit(10).lean(),
        Milestone.find({ startupId: startup._id }).lean(),
        Pitch.find({ startupId: startup._id })
          .populate('investorId', 'name avatar email verificationLevel')
          .lean(),
        Achievement.find({ startupId: startup._id }).sort({ createdAt: -1 }).lean(),
      ]);
    }

    const pendingApps = applications.filter((a: any) => a.status === 'pending');
    const pendingMilestones = milestonesList.filter((m: any) => m.status !== 'completed' && m.status !== 'cancelled');
    const pendingPitchRequests = pitchesList.filter((p: any) => p.pitchStatus === 'requested');
    const totalTeam = startups.reduce((sum: number, s: any) => sum + (s.team?.length || 0), 0);

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
      },
    });
  } catch (error) {
    console.error('Founder Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
