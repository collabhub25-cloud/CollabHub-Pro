import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Application, Startup } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

// GET /api/applications/received - Get applications received for founder's startups
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = extractTokenFromCookies(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startupId = searchParams.get('startupId');

    // Get user's startups
    const startupQuery: Record<string, unknown> = { founderId: payload.userId, isActive: true };
    const startups = await Startup.find(startupQuery).select('_id');
    const startupIds = startups.map(s => s._id);

    if (startupIds.length === 0) {
      return NextResponse.json({
        success: true,
        applications: [],
        total: 0,
      });
    }

    const query: Record<string, unknown> = { startupId: { $in: startupIds } };

    if (status) {
      query.status = status;
    }

    if (startupId) {
      query.startupId = startupId;
    }

    const applications = await Application.find(query)
      .populate('startupId', 'name industry stage logo')
      .populate('talentId', 'name email avatar skills trustScore verificationLevel bio location')
      .sort({ createdAt: -1 });

    // Group by status for convenience
    const byStatus = {
      pending: applications.filter(a => a.status === 'pending'),
      reviewed: applications.filter(a => a.status === 'reviewed'),
      shortlisted: applications.filter(a => a.status === 'shortlisted'),
      accepted: applications.filter(a => a.status === 'accepted'),
      rejected: applications.filter(a => a.status === 'rejected'),
    };

    return NextResponse.json({
      success: true,
      applications,
      total: applications.length,
      byStatus,
    });
  } catch (error) {
    console.error('Get received applications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
