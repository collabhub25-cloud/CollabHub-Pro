import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Subscription } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import { PLAN_PRICES, FounderPlanType } from '@/lib/subscription/features';
import Razorpay from 'razorpay';
import { createLogger } from '@/lib/logger';

const log = createLogger('payment-create-order');

const VALID_PAID_PLANS: FounderPlanType[] = ['pro_founder', 'scale_founder', 'enterprise_founder'];

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
            return NextResponse.json({ error: 'Only founders can subscribe to paid plans' }, { status: 403 });
        }

        // Parse planKey from request body
        let planKey: FounderPlanType = 'pro_founder';
        try {
            const body = await request.json();
            if (body.planKey && VALID_PAID_PLANS.includes(body.planKey)) {
                planKey = body.planKey;
            }
        } catch {
            // If no body, default to pro_founder
        }

        // Look up plan price
        const planPricing = PLAN_PRICES[planKey];
        if (!planPricing || planPricing.monthly === 0) {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        // Check if user already has this plan
        const existingSub = await Subscription.findOne({ userId: decoded.userId });
        if (existingSub && existingSub.plan === planKey && existingSub.status === 'active') {
            return NextResponse.json({ error: 'You already have this plan active' }, { status: 400 });
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

        // Amount in paise (INR smallest unit)
        const amount = planPricing.monthly;
        const currency = 'INR';

        const planDisplayName = planKey.replace('_founder', '').toUpperCase();

        const orderOptions = {
            amount,
            currency,
            receipt: `receipt_${planKey}_${user._id.toString()}_${Date.now()}`,
            notes: {
                userId: user._id.toString(),
                planKey: planKey,
                planName: planDisplayName,
            }
        };

        const order = await razorpay.orders.create(orderOptions);

        log.info(`Created order ${order.id} for user ${decoded.userId}, plan: ${planKey}, amount: ₹${amount / 100}`);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            planKey,
            planName: planDisplayName,
        });

    } catch (error) {
        log.error('Error creating Razorpay order:', error);
        return NextResponse.json(
            { error: 'Failed to create payment order' },
            { status: 500 }
        );
    }
}

