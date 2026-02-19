import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Startup, User, Subscription } from '@/lib/models';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { validateInput, CreateStartupSchema, StartupUpdateSchema } from '@/lib/validation/schemas';
import { checkPlanLimit, checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';

// GET /api/startups - Get all startups or user's startups
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    let userId = null;
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    const { searchParams } = new URL(request.url);
    const startupId = searchParams.get('id');
    const founderId = searchParams.get('founderId');
    const industry = searchParams.get('industry');
    const stage = searchParams.get('stage');
    const fundingStage = searchParams.get('fundingStage');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // If requesting a specific startup by ID
    if (startupId) {
      const startup = await Startup.findById(startupId)
        .populate('founderId', 'name email avatar trustScore verificationLevel')
        .populate('team', 'name email avatar skills');
      
      if (!startup) {
        return NextResponse.json(
          { error: 'Startup not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        startup,
      });
    }

    // Build query
    const query: Record<string, unknown> = { isActive: true };
    
    if (founderId) {
      query.founderId = founderId;
    } else if (userId && !searchParams.get('all')) {
      // If authenticated and not requesting all, show user's startups
      query.$or = [
        { founderId: userId },
        { team: userId }
      ];
    }

    if (industry) {
      query.industry = new RegExp(industry, 'i');
    }

    if (stage) {
      query.stage = stage;
    }

    if (fundingStage) {
      query.fundingStage = fundingStage;
    }

    const startups = await Startup.find(query)
      .populate('founderId', 'name email avatar trustScore verificationLevel')
      .populate('team', 'name email avatar skills')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Startup.countDocuments(query);

    return NextResponse.json({
      success: true,
      startups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get startups error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/startups - Create a new startup
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, 'api');
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.api);
    
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.api.message);
    }

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

    // Check if user is a founder
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'founder') {
      return NextResponse.json(
        { error: 'Only founders can create startups' },
        { status: 403 }
      );
    }

    // Check plan limits
    const existingStartupCount = await Startup.countDocuments({ founderId: payload.userId, isActive: true });
    const limitCheck = await checkPlanLimit(payload.userId, 'maxProjects', existingStartupCount);
    
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: `You have reached the maximum number of projects (${limitCheck.limit}) for your ${limitCheck.plan} plan. Please upgrade to create more.`,
          currentPlan: limitCheck.plan,
          limit: limitCheck.limit
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Zod validation
    const validation = validateInput(CreateStartupSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { 
      name, 
      vision, 
      description, 
      stage, 
      industry, 
      fundingStage, 
      fundingAmount, 
      website, 
      logo,
      rolesNeeded 
    } = validation.data;

    // Create startup
    const startup = await Startup.create({
      founderId: payload.userId,
      name: name.trim(),
      vision: vision.trim(),
      description: description.trim(),
      stage,
      industry: industry.trim(),
      fundingStage,
      fundingAmount: fundingAmount || 0,
      website: website?.trim() || undefined,
      logo: logo?.trim() || undefined,
      team: [payload.userId],
      rolesNeeded: rolesNeeded || [],
      trustScore: user.trustScore,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await startup.populate([
      { path: 'founderId', select: 'name email avatar trustScore' },
      { path: 'team', select: 'name email avatar' },
    ]);

    console.log(`✅ New startup created: ${startup.name} by ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Startup created successfully',
      startup,
    });
  } catch (error) {
    console.error('Create startup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/startups - Update a startup
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Startup ID is required' },
        { status: 400 }
      );
    }

    // Check if user is founder of the startup
    const startup = await Startup.findById(id);
    if (!startup) {
      return NextResponse.json(
        { error: 'Startup not found' },
        { status: 404 }
      );
    }

    if (startup.founderId.toString() !== payload.userId) {
      return NextResponse.json(
        { error: 'You can only update your own startups' },
        { status: 403 }
      );
    }

    // SECURITY: Zod validation with whitelist (prevents mass assignment)
    const validation = validateInput(StartupUpdateSchema, updateData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // SECURITY: Only allow specific fields to be updated (whitelist pattern)
    const allowedFields = ['name', 'vision', 'description', 'stage', 'industry', 
                          'fundingStage', 'fundingAmount', 'revenue', 'website', 'isActive'];
    const safeUpdateData: Record<string, unknown> = { updatedAt: new Date() };
    
    for (const field of allowedFields) {
      if (validation.data && field in validation.data) {
        safeUpdateData[field] = validation.data[field as keyof typeof validation.data];
      }
    }

    // Update startup
    const updatedStartup = await Startup.findByIdAndUpdate(
      id,
      { $set: safeUpdateData },
      { new: true }
    ).populate([
      { path: 'founderId', select: 'name email avatar trustScore' },
      { path: 'team', select: 'name email avatar' },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Startup updated successfully',
      startup: updatedStartup,
    });
  } catch (error) {
    console.error('Update startup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/startups - Delete a startup (soft delete)
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Startup ID is required' },
        { status: 400 }
      );
    }

    // Check if user is founder of the startup
    const startup = await Startup.findById(id);
    if (!startup) {
      return NextResponse.json(
        { error: 'Startup not found' },
        { status: 404 }
      );
    }

    if (startup.founderId.toString() !== payload.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own startups' },
        { status: 403 }
      );
    }

    // Soft delete
    await Startup.findByIdAndUpdate(id, { $set: { isActive: false, updatedAt: new Date() } });

    return NextResponse.json({
      success: true,
      message: 'Startup deleted successfully',
    });
  } catch (error) {
    console.error('Delete startup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
