import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { AccessRequest, Startup, User, Notification } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';

// POST /api/funding/request-access/respond - Approve or reject an access request
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
        const { requestId, status } = body;

        if (!requestId || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'requestId and status (approved/rejected) are required' },
                { status: 400 }
            );
        }

        const accessRequest = await AccessRequest.findById(requestId)
            .populate('startupId', 'name founderId');

        if (!accessRequest) {
            return NextResponse.json(
                { error: 'Access request not found' },
                { status: 404 }
            );
        }

        // Verify the user is the founder of the startup
        const startup = await Startup.findById(accessRequest.startupId);
        if (!startup || startup.founderId.toString() !== decoded.userId) {
            return NextResponse.json(
                { error: 'Only the startup founder can respond to access requests' },
                { status: 403 }
            );
        }

        // Update request status
        accessRequest.status = status;
        await accessRequest.save();

        // Notify the investor
        const investorId = accessRequest.investorId || accessRequest.reqUserId;
        await Notification.create({
            userId: investorId,
            type: 'funding_update',
            title: `Access Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            message: `Your access request to ${startup.name} has been ${status}`,
            actionUrl: `/startup/${startup._id}`,
            metadata: {
                requestId: accessRequest._id,
                startupId: startup._id.toString(),
            },
        });

        return NextResponse.json({
            success: true,
            message: `Access request ${status}`,
            request: {
                _id: accessRequest._id,
                status: accessRequest.status,
            },
        });
    } catch (error) {
        console.error('Error responding to access request:', error);
        return NextResponse.json(
            { error: 'Failed to respond to access request' },
            { status: 500 }
        );
    }
}
