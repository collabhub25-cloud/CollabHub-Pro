import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user.model';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: 'admin';
}

/**
 * Verify that the request is from an authenticated admin user.
 * Defense-in-depth: middleware already checks role for /api/admin/* routes,
 * but this provides route-handler-level validation.
 */
export async function requireAdmin(req: NextRequest): Promise<AdminUser | null> {
  const token = req.cookies.get('accessToken')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    if (decoded.role !== 'admin') return null;

    await connectDB();
    const user = await User.findById(decoded.userId).select('_id email name role').lean();
    if (!user || (user as any).role !== 'admin') return null;

    return {
      _id: (user as any)._id.toString(),
      email: (user as any).email,
      name: (user as any).name,
      role: 'admin',
    };
  } catch {
    return null;
  }
}

/**
 * Return a 403 JSON response for unauthorized admin requests
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized – admin access required' },
    { status: 403 }
  );
}
