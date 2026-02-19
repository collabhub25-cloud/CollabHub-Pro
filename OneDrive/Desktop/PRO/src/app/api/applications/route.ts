import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Application, Startup, User } from '@/lib/models';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// GET /api/applications - Get applications (for talent)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startupId = searchParams.get('startupId');

    const query: Record<string, unknown> = { talentId: payload.userId };

    if (status) {
      query.status = status;
    }

    if (startupId) {
      query.startupId = startupId;
    }

    const applications = await Application.find(query)
      .populate('startupId', 'name industry stage logo')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      applications,
      total: applications.length,
    });
  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/applications - Submit an application
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is a talent
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'talent') {
      return NextResponse.json(
        { error: 'Only talents can submit applications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { startupId, roleId, coverLetter, resumeUrl, proposedEquity, proposedCash } = body;

    // Validation
    if (!startupId || !roleId || !coverLetter) {
      return NextResponse.json(
        { error: 'Missing required fields', fields: { startupId: !startupId, roleId: !roleId, coverLetter: !coverLetter } },
        { status: 400 }
      );
    }

    if (coverLetter.trim().length < 50) {
      return NextResponse.json(
        { error: 'Cover letter must be at least 50 characters' },
        { status: 400 }
      );
    }

    // Check if startup exists
    const startup = await Startup.findById(startupId);
    if (!startup) {
      return NextResponse.json(
        { error: 'Startup not found' },
        { status: 404 }
      );
    }

    if (!startup.isActive) {
      return NextResponse.json(
        { error: 'This startup is no longer accepting applications' },
        { status: 400 }
      );
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      startupId,
      talentId: payload.userId,
      roleId,
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied for this role' },
        { status: 400 }
      );
    }

    // Create application
    const application = await Application.create({
      startupId,
      talentId: payload.userId,
      roleId,
      coverLetter: coverLetter.trim(),
      resumeUrl: resumeUrl?.trim() || undefined,
      proposedEquity: proposedEquity || undefined,
      proposedCash: proposedCash || undefined,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await application.populate([
      { path: 'startupId', select: 'name industry stage logo' },
      { path: 'talentId', select: 'name email avatar skills trustScore verificationLevel' },
    ]);

    console.log(`✅ New application: ${user.email} applied to ${startup.name}`);

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    console.error('Create application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/applications - Update application status (for founders)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status, interviewNotes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user is founder of the startup
    const startup = await Startup.findById(application.startupId);
    if (!startup || startup.founderId.toString() !== payload.userId) {
      return NextResponse.json(
        { error: 'You can only update applications to your own startups' },
        { status: 403 }
      );
    }

    const validStatuses = ['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (interviewNotes !== undefined) updateData.interviewNotes = interviewNotes;

    const updatedApplication = await Application.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate([
      { path: 'startupId', select: 'name industry stage' },
      { path: 'talentId', select: 'name email avatar skills trustScore verificationLevel' },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Application updated successfully',
      application: updatedApplication,
    });
  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
