import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { AccessRequest, Startup, User, Notification } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';

// POST /api/funding/request-access - Request access to startup data
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

    // Verify investor role
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'investor') {
      return NextResponse.json(
        { error: 'Only investors can request access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { startupId, message } = body;

    if (!startupId) {
      return NextResponse.json(
        { error: 'Startup ID is required' },
        { status: 400 }
      );
    }

    // Verify startup exists
    const startup = await Startup.findById(startupId);
    if (!startup) {
      return NextResponse.json(
        { error: 'Startup not found' },
        { status: 404 }
      );
    }

    // Prevent requesting access to own startup (if investor is also a founder)
    if (startup.founderId.toString() === decoded.userId) {
      return NextResponse.json(
        { error: 'Cannot request access to your own startup' },
        { status: 400 }
      );
    }

    // Check for duplicate request (including rejected - allow re-request after rejection)
    const existing = await AccessRequest.findOne({
      investorId: decoded.userId,
      startupId,
      status: { $ne: 'rejected' }, // Allow re-request if previously rejected
    });

    if (existing) {
      return NextResponse.json(
        { 
          error: existing.status === 'pending' 
            ? 'Access request already pending' 
            : 'Access already granted',
          request: existing 
        },
        { status: 400 }
      );
    }

    // If there was a rejected request, delete it
    await AccessRequest.deleteOne({
      investorId: decoded.userId,
      startupId,
      status: 'rejected',
    });

    // Create access request
    const accessRequest = await AccessRequest.create({
      investorId: decoded.userId,
      startupId,
      founderId: startup.founderId,
      status: 'pending',
      message: message?.substring(0, 500),
    });

    // Notify founder
    await Notification.create({
      userId: startup.founderId,
      type: 'access_request',
      title: 'Access Request',
      message: `${user.name} requested access to ${startup.name}`,
      actionUrl: '/funding',
      metadata: {
        requestId: accessRequest._id,
        investorId: decoded.userId,
        startupId,
      },
    });

    return NextResponse.json({
      success: true,
      request: {
        _id: accessRequest._id,
        status: accessRequest.status,
        createdAt: accessRequest.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating access request:', error);
    return NextResponse.json(
      { error: 'Failed to create access request' },
      { status: 500 }
    );
  }
}

// GET /api/funding/request-access - Get access requests
// For Founders: Get requests for their startups
// For Investors: Get their own requests
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

    // Get user role
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query: Record<string, unknown> = {};

    // Founders see requests to their startups
    // Investors see their own requests
    if (user.role === 'founder') {
      query.founderId = decoded.userId;
    } else if (user.role === 'investor') {
      query.investorId = decoded.userId;
    } else {
      return NextResponse.json(
        { error: 'Invalid role for access requests' },
        { status: 403 }
      );
    }

    if (status) query.status = status;

    const requests = await AccessRequest.find(query)
      .populate('investorId', 'name email avatar role trustScore verificationLevel')
      .populate('startupId', 'name industry stage logo vision description')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      requests,
      total: requests.length,
    });
  } catch (error) {
    console.error('Error fetching access requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access requests' },
      { status: 500 }
    );
  }
}
