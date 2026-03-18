import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Subscription } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import Razorpay from 'razorpay';
import { createLogger } from '@/lib/logger';
import { PLAN_PRICES, type FounderPlanType } from '@/lib/subscription/features';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';

const log = createLogger('payment-create-order');

// Plan display names for Razorpay description
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  pro_founder: 'Pro',
  scale_founder: 'Scale',
  enterprise_founder: 'Enterprise',
};

// POST /api/payments/create-order
export async function POST(request: NextRequest) {
    try {
        const rateLimitKey = getRateLimitKey(request, 'payments_create');
        const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.payments);
        
        if (!rateLimitResult.allowed) {
            return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.payments.message);
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

        const user = await User.findById(decoded.userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.role !== 'founder') {
            return NextResponse.json({ error: 'Only founders can upgrade subscriptions' }, { status: 403 });
        }

        // Parse plan selection from request body
        let planKey: FounderPlanType = 'pro_founder';
        let billingCycle: 'monthly' | 'yearly' = 'monthly';

        try {
            const body = await request.json();
            if (body.planKey && ['pro_founder', 'scale_founder', 'enterprise_founder'].includes(body.planKey)) {
                planKey = body.planKey as FounderPlanType;
            }
            if (body.billingCycle === 'yearly') {
                billingCycle = 'yearly';
            }
        } catch {
            // If no body or invalid JSON, default to pro_founder monthly
        }

        // Check if user already has this plan
        const existingSub = await Subscription.findOne({ userId: decoded.userId });
        if (existingSub && existingSub.plan === planKey && existingSub.status === 'active') {
            return NextResponse.json({ error: 'You are already subscribed to this plan' }, { status: 400 });
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

        // Get price from plan configuration (prices are already in INR)
        const planPrices = PLAN_PRICES[planKey];
        const amount = billingCycle === 'yearly'
            ? planPrices.yearly * 100  // Convert to paise
            : planPrices.monthly * 100; // Convert to paise

        const currency = 'INR';
        const planName = PLAN_DISPLAY_NAMES[planKey] || 'Pro';

        const orderOptions = {
            amount,
            currency,
            receipt: `receipt_${user._id.toString()}_${Date.now()}`,
            notes: {
                userId: user._id.toString(),
                planKey,
                billingCycle,
                planName,
            }
        };

        const order = await razorpay.orders.create(orderOptions);

        log.info(`Created order ${order.id} for user ${decoded.userId} - Plan: ${planKey} (${billingCycle})`);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            planKey,
            planName,
            billingCycle,
        });

    } catch (error) {
        log.error('Error creating Razorpay order:', error);
        return NextResponse.json(
            { error: 'Failed to create payment order' },
            { status: 500 }
        );
    }
}
