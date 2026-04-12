import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Startup, User, Subscription, TeamMember, Payment } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { validateInput, CreateStartupSchema, StartupUpdateSchema } from '@/lib/validation/schemas';
import { checkPlanLimit, checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { sanitizeObject } from '@/lib/security/sanitize';
import { createLogger } from '@/lib/logger';
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL, getCache } from '@/lib/cache';
import { onStartupEdit } from '@/lib/cache-invalidation';
import { perfTracker } from '@/lib/perf-analytics';

const log = createLogger('startups');

// GET /api/startups - Get all startups or user's startups
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await connectDB();

    const token = extractTokenFromCookies(request);

    let userId: string | null = null;
    if (token) {
      const payload = verifyAccessToken(token);
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

    // If requesting a specific startup by ID — cached 5 min
    if (startupId) {
      const data = await cacheOrFetch(
        CACHE_KEYS.startupDetail(startupId),
        async () => {
          const startup = await Startup.findById(startupId)
            .populate('founderId', 'name email avatar verificationLevel')
            .populate('team', 'name email avatar skills')
            .lean();
          return startup;
        },
        CACHE_TTL.MEDIUM
      );

      if (!data) {
        return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
      }

      const duration = Date.now() - start;
      perfTracker.recordResponse('GET /api/startups/:id', duration);
      const response = NextResponse.json({ success: true, startup: data });
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }

    // Build user-scoped cache key
    const cacheUserId = userId || '__global__';
    const filterKey = `p${page}_l${limit}_f${founderId || ''}_i${industry || ''}_s${stage || ''}_fs${fundingStage || ''}`;
    
    const data = await cacheOrFetch(
      CACHE_KEYS.startupList(cacheUserId, filterKey),
      async () => {
        // Build query — ALWAYS scope to the authenticated user for dashboard views
        const query: Record<string, unknown> = { isActive: true };

        if (founderId) {
          // Explicit founder filter (e.g., viewing a specific founder's startups)
          query.founderId = founderId;
        } else if (userId) {
          // Dashboard view: only show startups the user owns or is a team member of
          query.$or = [
            { founderId: userId },
            { team: userId }
          ];
        }
        // If no userId and no founderId, return public startups (discover page)

        if (industry) {
          query.industry = new RegExp(industry, 'i');
        }
        if (stage) {
          query.stage = stage;
        }
        if (fundingStage) {
          query.fundingStage = fundingStage;
        }

        const [startups, total] = await Promise.all([
          Startup.find(query)
            .populate('founderId', 'name email avatar verificationLevel')
            .populate('team', 'name email avatar skills')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Startup.countDocuments(query),
        ]);

        return {
          startups,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
      },
      CACHE_TTL.SHORT // 60s instead of 5min for fresher data
    );

    const duration = Date.now() - start;
    perfTracker.recordResponse('GET /api/startups', duration);
    log.debug(`GET /api/startups: userId=${userId}, cacheKey=startups:list:${cacheUserId}:${filterKey}, duration=${duration}ms`);
    const response = NextResponse.json({ success: true, ...data });
    response.headers.set('X-Response-Time', `${duration}ms`);
    // CRITICAL: user-specific data must NOT be publicly cached
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    perfTracker.recordResponse('GET /api/startups', Date.now() - start, true);
    log.error('Get startups error', error);
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

    // Check if user is a founder
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'founder') {
      return NextResponse.json(
        { error: 'Only founders can create startups' },
        { status: 403 }
      );
    }

    // Enforce verification level 1
    if ((user.verificationLevel || 0) < 1) {
      return NextResponse.json(
        { error: 'Verification Level 1 (Profile Completion) required to create a startup' },
        { status: 403 }
      );
    }

    // Enforce one startup per active founder limit
    const existingStartupCount = await Startup.countDocuments({ 
      founderId: payload.userId,
      isActive: { $ne: false }
    });

    if (existingStartupCount >= 1) {
      return NextResponse.json(
        { error: 'Founders are limited to creating one startup.' },
        { status: 403 }
      );
    }

    // CRITICAL: Enforce ₹499 payment before startup creation
    const profilePayment = await Payment.findOne({
      fromUserId: payload.userId,
      purpose: 'founder_profile',
      status: 'completed',
    });

    if (!profilePayment) {
      log.warn(`Startup creation blocked: no payment found for user=${payload.userId}`);
      return NextResponse.json(
        {
          error: 'Payment required. Please pay the ₹499 profile creation fee before creating a startup.',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 402 }
      );
    }

    log.info(`Payment verified for startup creation: paymentId=${profilePayment._id}, user=${payload.userId}`);

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    // Zod validation
    const validation = validateInput(CreateStartupSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors, fields: validation.fields },
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
      rolesNeeded
    } = validation.data;
    const logo = body?.logo as string | undefined;

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
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create Founder team member record
    await TeamMember.create({
      userId: payload.userId,
      startupId: startup._id,
      role: 'Founder',
      isFounder: true,
      skills: user.skills || [],
      equity: 100, // Or appropriate default
      status: 'active',
      joinedAt: new Date(),
    });

    await startup.populate([
      { path: 'founderId', select: 'name email avatar' },
      { path: 'team', select: 'name email avatar' },
    ]);

    log.info(`New startup created: ${startup.name} by ${user.email}`);

    // Invalidate startup caches after creation
    await onStartupEdit(startup._id.toString(), payload.userId);

    return NextResponse.json({
      success: true,
      message: 'Startup created successfully',
      startup,
    });
  } catch (error) {
    log.error('Create startup error', error);
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
        { error: 'Validation failed', details: validation.errors, fields: validation.fields },
        { status: 400 }
      );
    }

    // SECURITY: Only allow specific fields to be updated (whitelist pattern)
    const allowedFields = ['name', 'vision', 'description', 'stage', 'industry',
      'fundingStage', 'fundingAmount', 'revenue', 'website', 'isActive',
      'skillsNeeded', 'pastProgress', 'achievements'];
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
      { path: 'founderId', select: 'name email avatar' },
      { path: 'team', select: 'name email avatar' },
    ]);

    // Invalidate startup caches after update
    await onStartupEdit(id, payload.userId);

    return NextResponse.json({
      success: true,
      message: 'Startup updated successfully',
      startup: updatedStartup,
    });
  } catch (error) {
    log.error('Update startup error', error);
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

    // Invalidate startup caches after deletion
    await onStartupEdit(id, payload.userId);

    return NextResponse.json({
      success: true,
      message: 'Startup deleted successfully',
    }, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    log.error('Delete startup error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
