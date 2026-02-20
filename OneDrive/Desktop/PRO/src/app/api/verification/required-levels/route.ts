import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import { getRequiredLevels } from '@/lib/verification-service';
import { User } from '@/lib/models';
import { connectDB } from '@/lib/mongodb';

// GET /api/verification/required-levels - Get required verification levels for current user's role
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(decoded.userId).select('role');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.role as 'talent' | 'founder' | 'investor' | 'admin';
    const requiredLevels = getRequiredLevels(userRole);

    return NextResponse.json(requiredLevels);
  } catch (error) {
    console.error('Error fetching required levels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch required verification levels' },
      { status: 500 }
    );
  }
}
