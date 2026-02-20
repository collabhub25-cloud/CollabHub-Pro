import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Startup, Investor } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

// GET /api/users/me - Get current user's full profile
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

    const user = await User.findById(decoded.userId).select('-passwordHash').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get verification status
    const verifications = await Verification.find({ userId: decoded.userId }).lean();
    
    // Get additional role-specific data
    let roleSpecificData = {};
    
    if (user.role === 'founder') {
      const startups = await Startup.find({ founderId: decoded.userId })
        .select('name stage industry trustScore isActive')
        .lean();
      roleSpecificData = { startups };
    }
    
    if (user.role === 'investor') {
      const investorProfile = await Investor.findOne({ userId: decoded.userId }).lean();
      roleSpecificData = { investorProfile };
    }

    return NextResponse.json({
      user: {
        ...user,
        _id: user._id.toString(),
        verifications: verifications.map(v => ({
          type: v.type,
          status: v.status,
          level: v.level,
        })),
      },
      ...roleSpecificData,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/me - Update current user's profile
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const allowedFields = ['name', 'bio', 'skills', 'experience', 'githubUrl', 'linkedinUrl', 'portfolioUrl', 'location', 'avatar'];
    
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { $set: updates },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user.toObject(),
        _id: user._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
