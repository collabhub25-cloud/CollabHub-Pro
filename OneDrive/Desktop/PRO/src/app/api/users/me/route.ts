import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Startup, Investor, Alliance, Application, Milestone, Notification, Message } from '@/lib/models';
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
        .select('name stage industry isActive')
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

    // Auto-increment verificationLevel from 0 → 1 when profile is complete (name + bio filled)
    if (user.verificationLevel === 0 && user.name && user.bio) {
      user.verificationLevel = 1;
      await user.save();

      // Create/update the 'profile' verification record as approved
      await Verification.findOneAndUpdate(
        { userId: decoded.userId, type: 'profile', role: user.role },
        {
          status: 'approved',
          level: 0,
          role: user.role,
          type: 'profile',
          userId: decoded.userId,
          verifiedAt: new Date(),
        },
        { upsert: true, new: true }
      );
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

// DELETE /api/users/me - Delete current user's account and all associated data
export async function DELETE(request: NextRequest) {
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

    const userId = decoded.userId;

    // Delete all associated data in parallel
    await Promise.all([
      Startup.deleteMany({ founderId: userId }),
      Application.deleteMany({ talentId: userId }),
      Alliance.deleteMany({ $or: [{ requesterId: userId }, { receiverId: userId }] }),
      Milestone.deleteMany({ assignedTo: userId }),
      Notification.deleteMany({ userId }),
      Verification.deleteMany({ userId }),
      Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
      Investor.deleteMany({ userId }),
    ]);

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Clear auth cookies
    const response = NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });

    response.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });

    return response;
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
