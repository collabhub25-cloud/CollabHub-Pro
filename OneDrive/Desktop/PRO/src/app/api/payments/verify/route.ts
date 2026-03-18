import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Subscription, User, Payment } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import crypto from 'crypto';
import { createLogger } from '@/lib/logger';
import { FOUNDER_PLAN_FEATURES, type FounderPlanType } from '@/lib/subscription/features';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';

const log = createLogger('payment-verify');

// POST /api/payments/verify
export async function POST(request: NextRequest) {
    try {
        const rateLimitKey = getRateLimitKey(request, 'payments_verify');
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

        if (!process.env.RAZORPAY_KEY_SECRET) {
            log.error('Razorpay secret not configured');
            return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
        }

        const body = await request.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planKey } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
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
        if (!user || user.role !== 'founder') {
            return NextResponse.json({ error: 'User validation failed' }, { status: 403 });
        }

        // Determine which plan to assign
        const validPlans: FounderPlanType[] = ['pro_founder', 'scale_founder', 'enterprise_founder'];
        const selectedPlan: FounderPlanType = (planKey && validPlans.includes(planKey)) ? planKey : 'pro_founder';
        const planFeatures = FOUNDER_PLAN_FEATURES[selectedPlan];

        // Determine billing period (30 days for monthly, 365 for yearly)
        const billingCycle = body.billingCycle || 'monthly';
        const periodDays = billingCycle === 'yearly' ? 365 : 30;

        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + periodDays);

        // Update Subscription
        const subscription = await Subscription.findOneAndUpdate(
            { userId: decoded.userId },
            {
                plan: selectedPlan,
                role: 'founder',
                status: 'active',
                currentPeriodStart: now,
                currentPeriodEnd: expiresAt,
                cancelAtPeriodEnd: false,
                features: {
                    maxProjects: planFeatures.maxProjects,
                    maxTeamMembers: planFeatures.maxTeamMembers,
                    profileBoost: planFeatures.profileBoost,
                    advancedAnalytics: planFeatures.advancedAnalytics,
                    earlyDealAccess: planFeatures.earlyDealAccess,
                    prioritySupport: planFeatures.prioritySupport,
                },
                updatedAt: now,
            },
            { new: true, upsert: true }
        );

        // Record the payment
        await Payment.create({
            type: 'subscription',
            amount: body.amount ? Number(body.amount) / 100 : 0, // Convert paise to INR
            currency: 'INR',
            status: 'completed',
            fromUserId: decoded.userId,
            platformFee: 0,
            metadata: {
                razorpay_order_id,
                razorpay_payment_id,
                planKey: selectedPlan,
                billingCycle,
            },
        });

        log.info(`Upgraded user ${decoded.userId} to ${selectedPlan} plan via Razorpay payment ${razorpay_payment_id}`);

        // Send subscription confirmation email (non-blocking)
        try {
            const { sendSubscriptionEmail } = await import('@/lib/mailer');
            const planDisplayName = selectedPlan.replace('_founder', '').toUpperCase();
            await sendSubscriptionEmail(
                user.email,
                user.name || 'User',
                planDisplayName,
                expiresAt
            );
        } catch (emailErr) {
            log.error('Failed to send subscription confirmation email (non-blocking):', emailErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Payment verified successfully and subscription upgraded.',
            subscription,
            plan: selectedPlan,
        });

    } catch (error) {
        log.error('Error verifying Razorpay payment:', error);
        return NextResponse.json(
            { error: 'Failed to verify payment' },
            { status: 500 }
        );
    }
}
