import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user.model';
import { requireAdmin, unauthorizedResponse } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users — List users with pagination, search, and role filter
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
    const role = searchParams.get('role') || '';
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (role && ['founder', 'investor', 'talent', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role avatar isEmailVerified verificationLevel createdAt lastActive authProvider')
        .sort({ [sort]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Users] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users — Update a user's role or verification status
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { userId, updates } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Whitelist allowed fields
    const allowed: Record<string, unknown> = {};
    if (updates.role && ['founder', 'investor', 'talent', 'admin'].includes(updates.role)) {
      allowed.role = updates.role;
    }
    if (typeof updates.isEmailVerified === 'boolean') {
      allowed.isEmailVerified = updates.isEmailVerified;
    }
    if (typeof updates.verificationLevel === 'number' && [0, 1, 2, 3, 4, 5].includes(updates.verificationLevel)) {
      allowed.verificationLevel = updates.verificationLevel;
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(userId, allowed, { new: true })
      .select('name email role isEmailVerified verificationLevel')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[Admin] ${admin.email} updated user ${userId}:`, allowed);

    return NextResponse.json({ user, message: 'User updated successfully' });
  } catch (error) {
    console.error('[Admin Users] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
