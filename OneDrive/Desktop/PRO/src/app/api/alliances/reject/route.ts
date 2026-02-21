import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Alliance, User, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { validateInput, AllianceActionSchema } from '@/lib/validation/schemas';

// POST /api/alliances/reject - Reject alliance request
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
    
    // Zod validation
    const validation = validateInput(AllianceActionSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors, fields: validation.fields },
        { status: 400 }
      );
    }

    const { allianceId } = validation.data;

    const alliance = await Alliance.findById(allianceId);

    if (!alliance) {
      return NextResponse.json(
        { error: 'Alliance not found' },
        { status: 404 }
      );
    }

    // Only receiver can reject
    if (alliance.receiverId.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: 'Not authorized to reject this alliance' },
        { status: 403 }
      );
    }

    // Check if already processed
    if (alliance.status !== 'pending') {
      return NextResponse.json(
        { error: `Alliance already ${alliance.status}` },
        { status: 400 }
      );
    }

    // Update alliance status (soft delete by setting rejected)
    alliance.status = 'rejected';
    await alliance.save();

    // Get rejecter's info
    const rejecter = await User.findById(decoded.userId).select('name').lean();

    // Create notification for requester (optional - some prefer not to notify on rejection)
    const notification = await Notification.create({
      userId: alliance.requesterId,
      type: 'alliance_rejected',
      title: 'Alliance Request Update',
      message: `${rejecter?.name || 'Someone'} declined your alliance request`,
      actionUrl: '/alliances',
      metadata: {
        allianceId: alliance._id.toString(),
        rejecterId: decoded.userId,
      },
    });

    return NextResponse.json({
      success: true,
      alliance: {
        _id: alliance._id.toString(),
        status: alliance.status,
        updatedAt: alliance.updatedAt,
      },
      notification,
    });
  } catch (error) {
    console.error('Error rejecting alliance:', error);
    return NextResponse.json(
      { error: 'Failed to reject alliance' },
      { status: 500 }
    );
  }
}
