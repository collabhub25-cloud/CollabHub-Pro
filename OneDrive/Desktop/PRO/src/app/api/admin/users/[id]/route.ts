import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user.model';
import { Startup } from '@/lib/models/startup.model';
import { requireAdmin, unauthorizedResponse } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[id] — Get single user details with related data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { id } = await params;
    await connectDB();

    const user = await User.findById(id)
      .select('-passwordHash -verificationOtpHash -resetPasswordOtpHash')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get startups if founder
    let startups: unknown[] = [];
    if ((user as any).role === 'founder') {
      startups = await Startup.find({ founderId: id })
        .select('name stage industry isActive AlloySphereVerified verificationStatus createdAt')
        .lean();
    }

    return NextResponse.json({ user, startups });
  } catch (error) {
    console.error('[Admin Users] GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id] — Deactivate a user (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { id } = await params;
    await connectDB();

    // Prevent admin from deleting themselves
    if (id === admin._id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const user = await User.findById(id).select('name email role');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete: rename email, set role flag
    await User.findByIdAndUpdate(id, {
      email: `deactivated_${Date.now()}_${user.email}`,
      isEmailVerified: false,
    });

    // Deactivate their startups
    await Startup.updateMany({ founderId: id }, { isActive: false });

    console.log(`[Admin] ${admin.email} deactivated user ${id} (${user.email})`);

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('[Admin Users] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
