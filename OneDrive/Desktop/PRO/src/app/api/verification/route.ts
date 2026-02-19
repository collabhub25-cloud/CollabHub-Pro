import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Notification, VERIFICATION_LEVELS, IVerification } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import {
  getRequiredLevels,
  isVerificationTypeAllowed,
  getLevelForType,
  calculateProgress,
  isVerificationComplete,
  validateResumeFile,
  validateResumeFileSize,
  sanitizeFileName,
} from '@/lib/verification-service';

// GET /api/verification - Get user's verification status with role-based levels
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(decoded.userId).select('verificationLevel role kycStatus');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.role as 'talent' | 'founder' | 'investor' | 'admin';

    // Get required levels for this role
    const requiredLevels = getRequiredLevels(userRole);

    // Get existing verifications for this user
    const verifications = await Verification.find({ userId: decoded.userId, role: userRole })
      .sort({ level: 1 })
      .lean();

    // Map verification status to levels
    const verificationStatus = requiredLevels.levels.map((levelInfo) => {
      const v = verifications.find((ver: IVerification) => ver.type === levelInfo.type);
      return {
        ...levelInfo,
        status: v?.status || 'pending',
        verificationId: v?._id,
        testScore: v?.testScore,
        testPassed: v?.testPassed,
        resumeUrl: v?.resumeUrl,
        resumeFileName: v?.resumeFileName,
        documents: v?.documents,
        ndaSignedAt: v?.ndaSignedAt,
        rejectionReason: v?.rejectionReason,
        verifiedAt: v?.verifiedAt,
      };
    });

    // Calculate progress
    const progress = calculateProgress(user.verificationLevel || 0, userRole);
    const isComplete = isVerificationComplete(user.verificationLevel || 0, userRole);

    return NextResponse.json({
      role: userRole,
      currentLevel: user.verificationLevel || 0,
      totalLevels: requiredLevels.totalLevels,
      progress,
      isComplete,
      kycStatus: user.kycStatus || 'pending',
      verifications: verificationStatus,
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}

// POST /api/verification - Submit verification
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.role as 'talent' | 'founder' | 'investor';

    const body = await request.json();
    const { type, documents, resumeUrl, resumeFileName, testScore, testPassed } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Verification type is required' },
        { status: 400 }
      );
    }

    // Check if this verification type is allowed for this role
    if (!isVerificationTypeAllowed(userRole, type)) {
      return NextResponse.json(
        { error: `Verification type '${type}' is not available for role '${userRole}'` },
        { status: 403 }
      );
    }

    // Get the level for this type
    const level = getLevelForType(userRole, type);
    if (level === null) {
      return NextResponse.json(
        { error: 'Invalid verification type for this role' },
        { status: 400 }
      );
    }

    // Check if verification already exists
    let verification = await Verification.findOne({ userId: decoded.userId, type, role: userRole });

    if (verification) {
      // Update existing verification
      if (documents && Array.isArray(documents)) {
        verification.documents = documents.map((d: { type: string; url: string; fileName?: string; fileSize?: number }) => ({
          type: d.type,
          url: d.url,
          fileName: d.fileName ? sanitizeFileName(d.fileName) : undefined,
          fileSize: d.fileSize,
          uploadedAt: new Date(),
        }));
      }
      if (resumeUrl) {
        verification.resumeUrl = resumeUrl;
        verification.resumeFileName = resumeFileName ? sanitizeFileName(resumeFileName) : undefined;
      }
      if (testScore !== undefined) {
        verification.testScore = testScore;
        verification.testPassed = testPassed ?? testScore >= 70;
      }
      verification.status = 'submitted';
      await verification.save();
    } else {
      // Create new verification
      verification = await Verification.create({
        userId: decoded.userId,
        role: userRole,
        type,
        level,
        status: 'submitted',
        documents: documents?.map((d: { type: string; url: string; fileName?: string; fileSize?: number }) => ({
          type: d.type,
          url: d.url,
          fileName: d.fileName ? sanitizeFileName(d.fileName) : undefined,
          fileSize: d.fileSize,
          uploadedAt: new Date(),
        })),
        resumeUrl,
        resumeFileName: resumeFileName ? sanitizeFileName(resumeFileName) : undefined,
        testScore,
        testPassed: testPassed ?? (testScore !== undefined ? testScore >= 70 : undefined),
      });
    }

    return NextResponse.json({
      success: true,
      verification,
      message: 'Verification submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting verification:', error);
    return NextResponse.json(
      { error: 'Failed to submit verification' },
      { status: 500 }
    );
  }
}
