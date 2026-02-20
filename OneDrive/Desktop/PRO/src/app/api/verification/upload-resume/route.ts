import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Notification } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import {
  canUploadResume,
  getLevelForType,
  validateResumeFile,
  validateResumeFileSize,
  sanitizeFileName,
  generateFileKey,
} from '@/lib/verification-service';

// POST /api/verification/upload-resume - Upload resume (Talent only)
export async function POST(request: NextRequest) {
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

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.role as 'talent' | 'founder' | 'investor';

    // Check if resume upload is allowed for this role
    if (!canUploadResume(userRole)) {
      return NextResponse.json(
        { error: 'Resume upload is only available for Talent users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fileUrl, fileName, fileSize, mimeType } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const typeValidation = validateResumeFile(mimeType || '', fileName);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.error }, { status: 400 });
    }

    // Validate file size
    const sizeValidation = validateResumeFileSize(fileSize || 0);
    if (!sizeValidation.valid) {
      return NextResponse.json({ error: sizeValidation.error }, { status: 400 });
    }

    // Get the level for resume verification
    const level = getLevelForType(userRole, 'resume');
    if (level === null) {
      return NextResponse.json(
        { error: 'Resume verification not configured for this role' },
        { status: 400 }
      );
    }

    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(fileName);

    // Check if verification already exists
    let verification = await Verification.findOne({
      userId: decoded.userId,
      type: 'resume',
      role: userRole,
    });

    if (verification) {
      // Update existing verification
      verification.resumeUrl = fileUrl;
      verification.resumeFileName = sanitizedFileName;
      verification.status = 'submitted';
      await verification.save();
    } else {
      // Create new verification
      verification = await Verification.create({
        userId: decoded.userId,
        role: userRole,
        type: 'resume',
        level,
        status: 'submitted',
        resumeUrl: fileUrl,
        resumeFileName: sanitizedFileName,
      });
    }

    // Create notification
    await Notification.create({
      userId: decoded.userId,
      type: 'verification_update',
      title: 'Resume Uploaded',
      message: 'Your resume has been uploaded successfully and is pending review.',
      metadata: { verificationId: verification._id, type: 'resume' },
    });

    return NextResponse.json({
      success: true,
      verification,
      message: 'Resume uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}

// GET /api/verification/upload-resume - Get resume status
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

    const userRole = user.role as 'talent' | 'founder' | 'investor';

    // Check if resume upload is allowed for this role
    if (!canUploadResume(userRole)) {
      return NextResponse.json(
        { error: 'Resume upload is only available for Talent users' },
        { status: 403 }
      );
    }

    const verification = await Verification.findOne({
      userId: decoded.userId,
      type: 'resume',
      role: userRole,
    });

    return NextResponse.json({
      hasResume: !!verification?.resumeUrl,
      resumeFileName: verification?.resumeFileName,
      status: verification?.status || 'pending',
      uploadedAt: verification?.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching resume status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume status' },
      { status: 500 }
    );
  }
}
