import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Investment, FundingRound, User } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import crypto from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('funding-verify');

// POST /api/funding/verify
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

        if (!process.env.RAZORPAY_KEY_SECRET) {
            log.error('Razorpay secret not configured');
            return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
        }

        const body = await request.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, investmentId } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !investmentId) {
            return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
        }

        // Verify Signature
        const text = razorpay_order_id + "|" + razorpay_payment_id;
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(text)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            log.error(`Signature mismatch for user ${decoded.userId}`);
            return NextResponse.json({ error: 'Invalid signature. Payment verification failed.' }, { status: 400 });
        }

        await connectDB();

        // Verify user role
        const user = await User.findById(decoded.userId);
        if (!user || user.role !== 'investor') {
            return NextResponse.json({ error: 'User validation failed' }, { status: 403 });
        }

        const investment = await Investment.findOne({ _id: investmentId, investorId: decoded.userId });
        if (!investment) {
            return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
        }

        if (investment.status === 'completed') {
            return NextResponse.json({ success: true, message: 'Already completed', investment });
        }

        investment.status = 'completed';
        // We could save razorpay properties here, but for brevity we just mark completed
        await investment.save();

        // Add to funding round
        const round = await FundingRound.findById(investment.fundingRoundId);
        if (round) {
            round.raisedAmount += investment.amount;
            if (round.raisedAmount >= round.targetAmount) {
                round.status = 'closed';
            }
            await round.save();
        }

        log.info(`Investment ${investment._id} completed for user ${decoded.userId} via Razorpay payment ${razorpay_payment_id}`);

        return NextResponse.json({
            success: true,
            message: 'Investment verified successfully.',
            investment
        });

    } catch (error) {
        log.error('Error verifying investment payment:', error);
        return NextResponse.json(
            { error: 'Failed to verify payment' },
            { status: 500 }
        );
    }
}
