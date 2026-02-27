import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Agreement, User } from '@/lib/models';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId } = authResult.user;

    await connectDB();
    const { agreementId } = await request.json();

    if (!agreementId) {
      return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
    }

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (!agreement.parties.some((partyId: any) => partyId.toString() === userId)) {
      return NextResponse.json({ error: 'You are not a party to this agreement' }, { status: 403 });
    }

    if (agreement.status !== 'sent' && agreement.status !== 'signed') {
      return NextResponse.json({ error: 'Agreement is not in a signable state' }, { status: 400 });
    }

    if (agreement.signedBy.some((signature: any) => signature.userId.toString() === userId)) {
      return NextResponse.json({ error: 'You have already signed this agreement' }, { status: 400 });
    }

    // Generate legally-binding immutable signature hash
    const timestamp = new Date();
    const hashData = `${agreement._id.toString()}|${userId}|${timestamp.toISOString()}|${agreement.content}`;
    const signatureHash = crypto.createHash('sha256').update(hashData).digest('hex');

    agreement.signedBy.push({
      userId,
      signedAt: timestamp,
      signatureHash
    });

    agreement.auditLog.push({
      action: 'signed',
      userId,
      timestamp,
      metadata: { signatureHash }
    });

    if (agreement.signedBy.length === agreement.parties.length) {
      agreement.status = 'active';
      agreement.auditLog.push({
        action: 'activated',
        userId: 'system' as unknown as any,
        timestamp: new Date(),
        metadata: { reason: 'All parties have signed' }
      });
    } else {
      agreement.status = 'signed';
    }

    await agreement.save();

    return NextResponse.json({
      success: true,
      message: 'Agreement signed successfully',
      data: agreement
    });
  } catch (error) {
    console.error('Agreement Sign Error:', error);
    return NextResponse.json({ error: 'Internal server error while signing agreement' }, { status: 500 });
  }
}
