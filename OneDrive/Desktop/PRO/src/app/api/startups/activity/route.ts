import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Investment, Milestone, Job } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'investor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // 1. Get all startups this investor is invested in
    const investments = await Investment.find({ investorId: payload.userId }).select('startupId').populate('startupId', 'name logo');
    
    if (investments.length === 0) {
      return NextResponse.json({ success: true, activity: [] });
    }

    const startupRefs = investments.map(inv => inv.startupId);
    const startupIds = startupRefs.map((s: any) => s._id);
    
    // 2. Aggregate activity (Milestones updated, Jobs posted)
    const recentMilestones = await Milestone.find({ startupId: { $in: startupIds }, status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('startupId', 'name logo');

    const recentJobs = await Job.find({ startupId: { $in: startupIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('startupId', 'name logo');

    // Format all into a combined feed chronologically
    const combinedActivity = [
      ...recentMilestones.map(m => ({
        id: `milestone-${m._id}`,
        type: 'milestone_completed',
        startup: m.startupId,
        title: `Completed Milestone: ${m.title}`,
        description: m.description,
        timestamp: m.updatedAt || m.createdAt
      })),
      ...recentJobs.map(j => ({
        id: `job-${j._id}`,
        type: 'job_posted',
        startup: j.startupId,
        title: `Hiring: ${j.title}`,
        description: `Experience: ${j.experienceLevel} | Type: ${j.employmentType}`,
        timestamp: j.createdAt
      }))
    ];

    combinedActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ success: true, activity: combinedActivity.slice(0, 15) });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
