import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Subscription, User } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import { FounderPlanType, PLAN_PRICES } from '@/lib/subscription/features';
import crypto from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('payment-verify');

const VALID_PAID_PLANS: FounderPlanType[] = ['pro_founder', 'scale_founder', 'enterprise_founder'];

// POST /api/payments/verify
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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planKey } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
        }

        // Determine which plan to upgrade to
        let targetPlan: FounderPlanType = 'pro_founder';
        if (planKey && VALID_PAID_PLANS.includes(planKey)) {
            targetPlan = planKey;
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

        // Update Subscription - 30 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const planDisplayName = targetPlan.replace('_founder', '').toUpperCase();

        const subscription = await Subscription.findOneAndUpdate(
            { userId: decoded.userId },
            {
                plan: targetPlan,
                status: 'active',
                currentPeriodEnd: expiresAt,
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                updatedAt: new Date(),
            },
            { new: true, upsert: true }
        );

        log.info(`Upgraded user ${decoded.userId} to ${planDisplayName} plan via Razorpay payment ${razorpay_payment_id}`);

        // Send notification emails (graceful - don't fail the payment if email fails)
        try {
            const { sendSubscriptionUpgradeEmail, sendPaymentReceiptEmail } = await import('@/lib/mailer');
            const amount = PLAN_PRICES[targetPlan]?.monthly || 0;

            await Promise.allSettled([
                sendSubscriptionUpgradeEmail(user.email, user.name, planDisplayName),
                sendPaymentReceiptEmail(
                    user.email,
                    user.name,
                    amount / 100,
                    planDisplayName,
                    razorpay_payment_id
                ),
            ]);
        } catch (emailError) {
            log.error('Failed to send notification emails (non-critical):', emailError);
        }

        return NextResponse.json({
            success: true,
            message: `Payment verified successfully. Subscription upgraded to ${planDisplayName}.`,
            subscription,
        });

    } catch (error) {
        log.error('Error verifying Razorpay payment:', error);
        return NextResponse.json(
            { error: 'Failed to verify payment' },
            { status: 500 }
        );
    }
}

