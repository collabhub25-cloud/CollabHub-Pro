import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Agreement, Notification, User } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import crypto from 'crypto';

// POST /api/agreements/sign - Sign an agreement
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

    const body = await request.json();
    const { agreementId } = body;

    if (!agreementId) {
      return NextResponse.json(
        { error: 'Agreement ID is required' },
        { status: 400 }
      );
    }

    const agreement = await Agreement.findById(agreementId)
      .populate('startupId', 'name')
      .populate('parties', 'name email');

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Verify user is a party to this agreement
    const isParty = agreement.parties.some(
      (p: any) => p._id.toString() === decoded.userId
    );

    if (!isParty) {
      return NextResponse.json(
        { error: 'You are not authorized to sign this agreement' },
        { status: 403 }
      );
    }

    // Check if already signed by this user
    const alreadySigned = agreement.signedBy.some(
      (s: any) => s.userId.toString() === decoded.userId
    );

    if (alreadySigned) {
      return NextResponse.json(
        { error: 'You have already signed this agreement' },
        { status: 400 }
      );
    }

    // Get user info
    const user = await User.findById(decoded.userId);

    // Generate signature hash
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${agreementId}-${decoded.userId}-${Date.now()}`)
      .digest('hex');

    // Add signature
    agreement.signedBy.push({
      userId: decoded.userId,
      signedAt: new Date(),
      signatureHash,
    });

    // Check if all parties have signed
    if (agreement.signedBy.length === agreement.parties.length) {
      agreement.status = 'signed';
    }

    await agreement.save();

    // Notify other parties
    const otherParties = agreement.parties.filter(
      (p: any) => p._id.toString() !== decoded.userId
    );

    for (const party of otherParties) {
      await Notification.create({
        userId: party._id,
        type: 'agreement_signed',
        title: 'Agreement Signed',
        message: `${user?.name || 'Someone'} has signed the ${agreement.type} agreement`,
        actionUrl: '/agreements',
        metadata: {
          agreementId: agreement._id,
          signedBy: decoded.userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      agreement: {
        _id: agreement._id,
        status: agreement.status,
        signedBy: agreement.signedBy,
      },
      signature: {
        userId: decoded.userId,
        signedAt: new Date(),
        signatureHash,
      },
    });
  } catch (error) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      { error: 'Failed to sign agreement' },
      { status: 500 }
    );
  }
}
