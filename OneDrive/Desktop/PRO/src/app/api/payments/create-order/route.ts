import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Subscription } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import Razorpay from 'razorpay';
import { createLogger } from '@/lib/logger';

const log = createLogger('payment-create-order');

// POST /api/payments/create-order
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

        if (user.role !== 'founder') {
            return NextResponse.json({ error: 'Only founders can upgrade to Pro' }, { status: 403 });
        }

        // Verify razorpay keys exist
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            log.error('Razorpay keys not configured');
            return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const amount = 49900; // ₹499 in paise
        const currency = 'INR';

        const orderOptions = {
            amount,
            currency,
            receipt: `receipt_${user._id.toString()}`,
            notes: {
                userId: user._id.toString()
            }
        };

        const order = await razorpay.orders.create(orderOptions);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        log.error('Error creating Razorpay order:', error);
        return NextResponse.json(
            { error: 'Failed to create payment order' },
            { status: 500 }
        );
    }
}
