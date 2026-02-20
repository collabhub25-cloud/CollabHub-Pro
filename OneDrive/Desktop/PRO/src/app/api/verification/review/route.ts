import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Notification, IVerification } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import { getRequiredLevels, isVerificationComplete } from '@/lib/verification-service';

// PATCH /api/verification/review - Admin review verification
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

    // Check if user is admin
    const adminUser = await User.findById(decoded.userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can review verifications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { verificationId, status, rejectionReason } = body;

    if (!verificationId || !status) {
      return NextResponse.json(
        { error: 'Verification ID and status are required' },
        { status: 400 }
      );
    }

    const verification = await Verification.findById(verificationId).populate('userId', 'role verificationLevel');
    if (!verification) {
      return NextResponse.json(
        { error: 'Verification not found' },
        { status: 404 }
      );
    }

    const userRole = verification.role;
    const userId = verification.userId._id || verification.userId;

    // Update verification status
    verification.status = status;
    verification.verifiedBy = decoded.userId;
    verification.verifiedAt = new Date();
    if (rejectionReason) {
      verification.rejectionReason = rejectionReason;
    }
    await verification.save();

    // If approved, update user's verification level
    if (status === 'approved') {
      const requiredLevels = getRequiredLevels(userRole);
      const levelInfo = requiredLevels.levels.find(l => l.type === verification.type);
      
      if (levelInfo) {
        const user = await User.findById(userId);
        if (user) {
          // Update verification level if this level is higher
          if (levelInfo.level > (user.verificationLevel || 0)) {
            user.verificationLevel = levelInfo.level;
            await user.save();
          }

          // Update KYC status if this was a KYC verification
          if (verification.type === 'kyc') {
            user.kycStatus = 'verified';
            await user.save();
          }

          // Check if all verifications are complete
          const allVerifications = await Verification.find({ userId, role: userRole });
          const allApproved = requiredLevels.levels.every(l => {
            const v = allVerifications.find((ver: IVerification) => ver.type === l.type);
            return v?.status === 'approved';
          });

          if (allApproved) {
            // User has completed all verification levels
            await Notification.create({
              userId: userId.toString(),
              type: 'verification_update',
              title: 'Verification Complete!',
              message: 'Congratulations! You have completed all verification levels.',
              metadata: { role: userRole, completedAt: new Date() },
            });
          }
        }
      }
    }

    // Create notification for the user
    await Notification.create({
      userId: userId.toString(),
      type: 'verification_update',
      title: 'Verification Update',
      message: `Your ${verification.type.replace('_', ' ')} verification has been ${status}`,
      metadata: { verificationId, type: verification.type, status },
    });

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error('Error reviewing verification:', error);
    return NextResponse.json(
      { error: 'Failed to review verification' },
      { status: 500 }
    );
  }
}

// GET /api/verification/review - Get pending verifications for admin
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

    // Check if user is admin
    const adminUser = await User.findById(decoded.userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view pending verifications' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'submitted,under_review';
    const role = searchParams.get('role');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filter: Record<string, unknown> = {
      status: { $in: status.split(',') },
    };

    if (role) {
      filter.role = role;
    }

    if (type) {
      filter.type = type;
    }

    const verifications = await Verification.find(filter)
      .populate('userId', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Verification.countDocuments(filter);

    return NextResponse.json({
      verifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending verifications' },
      { status: 500 }
    );
  }
}
