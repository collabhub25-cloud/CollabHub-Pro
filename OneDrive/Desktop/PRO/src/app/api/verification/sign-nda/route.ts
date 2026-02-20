import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Notification, Agreement } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import { getLevelForType, isVerificationTypeAllowed } from '@/lib/verification-service';
import crypto from 'crypto';

// POST /api/verification/sign-nda - Sign NDA for verification
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

    // Check if NDA is allowed for this role
    if (!isVerificationTypeAllowed(userRole, 'nda')) {
      return NextResponse.json(
        { error: 'NDA signing is not available for this role' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { agreementId, signature } = body;

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      );
    }

    // Generate signature hash
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${decoded.userId}-${signature}-${Date.now()}`)
      .digest('hex');

    // Get the level for NDA verification
    const level = getLevelForType(userRole, 'nda');

    // Check if verification already exists
    let verification = await Verification.findOne({
      userId: decoded.userId,
      type: 'nda',
      role: userRole,
    });

    const now = new Date();

    if (verification) {
      // Update existing verification
      verification.ndaSignedAt = now;
      verification.ndaSignatureHash = signatureHash;
      verification.status = 'approved';
      await verification.save();
    } else {
      // Create new verification
      verification = await Verification.create({
        userId: decoded.userId,
        role: userRole,
        type: 'nda',
        level: level || 2,
        status: 'approved',
        ndaSignedAt: now,
        ndaSignatureHash: signatureHash,
      });
    }

    // If agreementId provided, also sign the agreement
    if (agreementId) {
      await Agreement.findByIdAndUpdate(agreementId, {
        $push: {
          signedBy: {
            userId: decoded.userId,
            signedAt: now,
            signatureHash,
          },
        },
        $set: {
          status: 'signed',
          updatedAt: now,
        },
      });
    }

    // Update user's verification level
    if (level !== null && level > (user.verificationLevel || 0)) {
      user.verificationLevel = level;
      await user.save();
    }

    // Update trust score for completing NDA
    await User.findByIdAndUpdate(decoded.userId, {
      $inc: { trustScore: 5 },
    });

    // Create notification
    await Notification.create({
      userId: decoded.userId,
      type: 'verification_update',
      title: 'NDA Signed Successfully',
      message: 'You have successfully signed the Non-Disclosure Agreement.',
      metadata: { signedAt: now, verificationId: verification._id },
    });

    return NextResponse.json({
      success: true,
      verification,
      message: 'NDA signed successfully',
      signedAt: now,
    });
  } catch (error) {
    console.error('Error signing NDA:', error);
    return NextResponse.json(
      { error: 'Failed to sign NDA' },
      { status: 500 }
    );
  }
}
