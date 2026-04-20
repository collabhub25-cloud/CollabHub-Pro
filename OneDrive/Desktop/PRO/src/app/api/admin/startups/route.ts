import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Startup } from '@/lib/models/startup.model';
import { requireAdmin, unauthorizedResponse } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/startups — List all startups with pagination and filters
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorizedResponse();

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const stage = searchParams.get('stage') || '';
    const industry = searchParams.get('industry') || '';
    const verification = searchParams.get('verification') || '';
    const active = searchParams.get('active');

    // Build filter
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
      ];
    }

    if (stage && ['idea', 'validation', 'mvp', 'growth', 'scaling'].includes(stage)) {
      filter.stage = stage;
    }

    if (industry) {
      filter.industry = { $regex: industry, $options: 'i' };
    }

    if (verification && ['none', 'pending', 'approved', 'rejected'].includes(verification)) {
      filter.verificationStatus = verification;
    }

    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const [startups, total] = await Promise.all([
      Startup.find(filter)
        .select('name stage industry isActive AlloySphereVerified verificationStatus fundingStage fundingAmount isBoosted createdAt founderId')
        .populate('founderId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Startup.countDocuments(filter),
    ]);

    return NextResponse.json({
      startups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Startups] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/startups — Update startup fields
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { startupId, updates } = await req.json();

    if (!startupId) {
      return NextResponse.json({ error: 'startupId is required' }, { status: 400 });
    }

    // Whitelist allowed fields
    const allowed: Record<string, unknown> = {};
    if (typeof updates.isActive === 'boolean') allowed.isActive = updates.isActive;
    if (typeof updates.isBoosted === 'boolean') allowed.isBoosted = updates.isBoosted;
    if (updates.stage && ['idea', 'validation', 'mvp', 'growth', 'scaling'].includes(updates.stage)) {
      allowed.stage = updates.stage;
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectDB();
    const startup = await Startup.findByIdAndUpdate(startupId, allowed, { new: true })
      .select('name stage industry isActive isBoosted verificationStatus')
      .lean();

    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    console.log(`[Admin] ${admin.email} updated startup ${startupId}:`, allowed);

    return NextResponse.json({ startup, message: 'Startup updated successfully' });
  } catch (error) {
    console.error('[Admin Startups] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
