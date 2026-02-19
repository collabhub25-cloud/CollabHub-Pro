import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Milestone, Startup, User, TrustScoreLog } from '@/lib/models';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// GET /api/milestones - Get milestones
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
    const startupId = searchParams.get('startupId');
    const status = searchParams.get('status');
    const assigned = searchParams.get('assigned') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, unknown> = {};

    if (startupId) {
      query.startupId = startupId;
    }

    if (status) {
      query.status = status;
    }

    if (assigned) {
      query.assignedTo = payload.userId;
    } else {
      // For founders, show milestones from their startups
      const startups = await Startup.find({ 
        $or: [
          { founderId: payload.userId },
          { team: payload.userId }
        ],
        isActive: true 
      }).select('_id');
      const startupIds = startups.map(s => s._id);

      if (!startupId) {
        query.$or = [
          { startupId: { $in: startupIds } },
          { assignedTo: payload.userId }
        ];
      }
    }

    const milestones = await Milestone.find(query)
      .populate('startupId', 'name industry stage logo')
      .populate('assignedTo', 'name email avatar trustScore')
      .sort({ dueDate: 1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      milestones,
      total: milestones.length,
    });
  } catch (error) {
    console.error('Get milestones error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/milestones - Create a milestone
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

    const body = await request.json();
    const { startupId, assignedTo, title, description, amount, dueDate } = body;

    // Validation
    if (!startupId || !assignedTo || !title || !description || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if user is founder of the startup
    const startup = await Startup.findOne({ _id: startupId, founderId: payload.userId });
    if (!startup) {
      return NextResponse.json(
        { error: 'You can only create milestones for your own startups' },
        { status: 403 }
      );
    }

    // Verify assigned user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 404 }
      );
    }

    // Create milestone
    const milestone = await Milestone.create({
      startupId,
      assignedTo,
      title: title.trim(),
      description: description.trim(),
      amount,
      dueDate: new Date(dueDate),
      status: 'pending',
      escrowStatus: 'unfunded',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await milestone.populate([
      { path: 'startupId', select: 'name industry stage' },
      { path: 'assignedTo', select: 'name email avatar trustScore' },
    ]);

    console.log(`✅ New milestone created: ${milestone.title} for ${startup.name}`);

    return NextResponse.json({
      success: true,
      message: 'Milestone created successfully',
      milestone,
    });
  } catch (error) {
    console.error('Create milestone error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/milestones - Update milestone status
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
    const { id, status, notes, attachments } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      );
    }

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const startup = await Startup.findById(milestone.startupId);
    const isFounder = startup && startup.founderId.toString() === payload.userId;
    const isAssigned = milestone.assignedTo.toString() === payload.userId;

    if (!isFounder && !isAssigned) {
      return NextResponse.json(
        { error: 'You do not have permission to update this milestone' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (status) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'disputed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;

      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (notes !== undefined) updateData.notes = notes;
    if (attachments) updateData.attachments = attachments;

    const updatedMilestone = await Milestone.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate([
      { path: 'startupId', select: 'name industry stage' },
      { path: 'assignedTo', select: 'name email avatar trustScore' },
    ]);

    // Update trust score on milestone completion
    if (status === 'completed' && updatedMilestone) {
      await TrustScoreLog.create({
        userId: milestone.assignedTo,
        startupId: milestone.startupId,
        scoreChange: 2,
        reason: 'Milestone completed successfully',
        category: 'milestone',
        createdAt: new Date(),
      });

      await User.findByIdAndUpdate(milestone.assignedTo, {
        $inc: { trustScore: 2 }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone updated successfully',
      milestone: updatedMilestone,
    });
  } catch (error) {
    console.error('Update milestone error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
