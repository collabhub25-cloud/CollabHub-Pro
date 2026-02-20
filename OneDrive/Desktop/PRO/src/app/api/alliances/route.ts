import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Alliance, User, Notification, TrustScoreLog } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { validateInput, AllianceRequestSchema } from '@/lib/validation/schemas';

// Helper to check existing alliance between users
async function checkExistingAlliance(userId1: string, userId2: string) {
  const existing = await Alliance.findOne({
    $or: [
      { requesterId: userId1, receiverId: userId2 },
      { requesterId: userId2, receiverId: userId1 },
    ],
  });
  return existing;
}

// GET /api/alliances - Get my alliances (accepted, pending received, pending sent)
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'accepted', 'received', 'sent', 'all'

    let alliances: unknown[] = [];
    const userId = decoded.userId;

    if (type === 'accepted' || type === 'all') {
      // Get accepted alliances
      const accepted = await Alliance.find({
        status: 'accepted',
        $or: [{ requesterId: userId }, { receiverId: userId }],
      })
        .populate('requesterId', 'name email role avatar trustScore verificationLevel')
        .populate('receiverId', 'name email role avatar trustScore verificationLevel')
        .sort({ updatedAt: -1 })
        .lean();

      alliances = [...alliances, ...accepted.map((a: Record<string, unknown>) => ({
        ...a,
        _id: (a._id as { toString(): string }).toString(),
        requesterId: a.requesterId && typeof a.requesterId === 'object' 
          ? { ...(a.requesterId as object), _id: ((a.requesterId as { _id?: { toString(): string } })._id?.toString() || '') }
          : a.requesterId,
        receiverId: a.receiverId && typeof a.receiverId === 'object'
          ? { ...(a.receiverId as object), _id: ((a.receiverId as { _id?: { toString(): string } })._id?.toString() || '') }
          : a.receiverId,
        type: 'accepted',
      }))];
    }

    if (type === 'received' || type === 'all') {
      // Get pending requests received
      const received = await Alliance.find({
        status: 'pending',
        receiverId: userId,
      })
        .populate('requesterId', 'name email role avatar trustScore verificationLevel')
        .sort({ createdAt: -1 })
        .lean();

      alliances = [...alliances, ...received.map((a: Record<string, unknown>) => ({
        ...a,
        _id: (a._id as { toString(): string }).toString(),
        requesterId: a.requesterId && typeof a.requesterId === 'object'
          ? { ...(a.requesterId as object), _id: ((a.requesterId as { _id?: { toString(): string } })._id?.toString() || '') }
          : a.requesterId,
        receiverId: a.receiverId && typeof a.receiverId === 'object'
          ? { ...(a.receiverId as object), _id: ((a.receiverId as { _id?: { toString(): string } })._id?.toString() || '') }
          : a.receiverId,
        type: 'received',
      }))];
    }

    if (type === 'sent' || type === 'all') {
      // Get pending requests sent
      const sent = await Alliance.find({
        status: 'pending',
        requesterId: userId,
      })
        .populate('receiverId', 'name email role avatar trustScore verificationLevel')
        .sort({ createdAt: -1 })
        .lean();

      alliances = [...alliances, ...sent.map((a: Record<string, unknown>) => ({
        ...a,
        _id: (a._id as { toString(): string }).toString(),
        requesterId: a.requesterId && typeof a.requesterId === 'object'
          ? { ...(a.requesterId as object), _id: ((a.requesterId as { _id?: { toString(): string } })._id?.toString() || '') }
          : a.requesterId,
        receiverId: a.receiverId && typeof a.receiverId === 'object'
          ? { ...(a.receiverId as object), _id: ((a.receiverId as { _id?: { toString(): string } })._id?.toString() || '') }
          : a.receiverId,
        type: 'sent',
      }))];
    }

    // Get counts
    const acceptedCount = await Alliance.countDocuments({
      status: 'accepted',
      $or: [{ requesterId: userId }, { receiverId: userId }],
    });
    const receivedCount = await Alliance.countDocuments({
      status: 'pending',
      receiverId: userId,
    });
    const sentCount = await Alliance.countDocuments({
      status: 'pending',
      requesterId: userId,
    });

    return NextResponse.json({
      alliances,
      counts: {
        accepted: acceptedCount,
        received: receivedCount,
        sent: sentCount,
      },
    });
  } catch (error) {
    console.error('Error fetching alliances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alliances' },
      { status: 500 }
    );
  }
}

// POST /api/alliances - Send alliance request
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, 'alliance');
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.alliance);
    
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.alliance.message);
    }

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
    const validation = validateInput(AllianceRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { receiverId } = validation.data;

    const requesterId = decoded.userId;

    // Cannot send to self
    if (requesterId === receiverId) {
      return NextResponse.json(
        { error: 'Cannot send alliance request to yourself' },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for existing alliance (pending or accepted)
    const existing = await checkExistingAlliance(requesterId, receiverId);
    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json(
          { error: 'Already connected with this user' },
          { status: 400 }
        );
      }
      if (existing.status === 'pending') {
        if (existing.requesterId.toString() === requesterId) {
          return NextResponse.json(
            { error: 'Request already sent' },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { error: 'This user has already sent you a request. Check your received requests.' },
            { status: 400 }
          );
        }
      }
      if (existing.status === 'rejected') {
        // Allow re-request after rejection, delete old one
        await Alliance.findByIdAndDelete(existing._id);
      }
    }

    // Create alliance request
    const alliance = await Alliance.create({
      requesterId,
      receiverId,
      status: 'pending',
    });

    // Get requester info for notification
    const requester = await User.findById(requesterId).select('name role').lean();

    // Create notification for receiver
    const notification = await Notification.create({
      userId: receiverId,
      type: 'alliance_request',
      title: 'New Alliance Request',
      message: `${requester?.name || 'Someone'} wants to form an alliance with you`,
      actionUrl: '/alliances',
      metadata: {
        allianceId: alliance._id.toString(),
        requesterId,
        requesterName: requester?.name,
      },
    });

    return NextResponse.json({
      success: true,
      alliance: {
        _id: alliance._id.toString(),
        status: alliance.status,
        createdAt: alliance.createdAt,
      },
      notification,
    });
  } catch (error) {
    console.error('Error creating alliance:', error);
    return NextResponse.json(
      { error: 'Failed to create alliance request' },
      { status: 500 }
    );
  }
}

// DELETE /api/alliances - Remove alliance
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

    const { searchParams } = new URL(request.url);
    const allianceId = searchParams.get('id');

    if (!allianceId) {
      return NextResponse.json(
        { error: 'Alliance ID is required' },
        { status: 400 }
      );
    }

    const alliance = await Alliance.findById(allianceId);

    if (!alliance) {
      return NextResponse.json(
        { error: 'Alliance not found' },
        { status: 404 }
      );
    }

    // Only participants can remove alliance
    const userId = decoded.userId;
    if (
      alliance.requesterId.toString() !== userId &&
      alliance.receiverId.toString() !== userId
    ) {
      return NextResponse.json(
        { error: 'Not authorized to remove this alliance' },
        { status: 403 }
      );
    }

    await Alliance.findByIdAndDelete(allianceId);

    return NextResponse.json({
      success: true,
      message: 'Alliance removed successfully',
    });
  } catch (error) {
    console.error('Error removing alliance:', error);
    return NextResponse.json(
      { error: 'Failed to remove alliance' },
      { status: 500 }
    );
  }
}
