import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Payment, Startup, Subscription, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { verifyPaymentSignature } from '@/lib/payments/razorpay';
import { FOUNDER_PLAN_FEATURES } from '@/lib/subscription/features';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { createLogger } from '@/lib/logger';

const log = createLogger('payments:verify');

/**
 * POST /api/payments/verify
 * Verifies Razorpay payment signature server-side (CRITICAL).
 * NEVER trust frontend payment success — always verify here.
 *
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, 'payments');
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.payments);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.payments.message);
    }

    // Auth
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 });
    }

    await connectDB();

    // Find the payment record
    const payment = await Payment.findOne({
      razorpayOrderId,
      fromUserId: payload.userId,
    });

    if (!payment) {
      log.warn(`Payment record not found: order=${razorpayOrderId}, user=${payload.userId}`);
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Prevent re-verification
    if (payment.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        purpose: payment.purpose,
      });
    }

    // CRITICAL: Verify signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid) {
      log.error(`SIGNATURE VERIFICATION FAILED: order=${razorpayOrderId}, payment=${razorpayPaymentId}, user=${payload.userId}`);
      payment.status = 'failed';
      payment.failureReason = 'Signature verification failed';
      await payment.save();
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Update payment record
    payment.status = 'completed';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.verifiedAt = new Date();
    await payment.save();

    log.info(`Payment verified: order=${razorpayOrderId}, purpose=${payment.purpose}, user=${payload.userId}`);

    // Execute purpose-specific side effects
    await handlePaymentSideEffects(payment.purpose, payload.userId, payment);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      purpose: payment.purpose,
      paymentId: payment._id.toString(),
    });
  } catch (error) {
    log.error('Payment verification error', error);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}

/**
 * Handle side effects after successful payment verification.
 */
async function handlePaymentSideEffects(
  purpose: string,
  userId: string,
  payment: any
) {
  switch (purpose) {
    case 'founder_profile': {
      // Payment verified — founder can now create a startup
      // We store the payment reference; startup creation happens via /api/startups
      log.info(`Founder profile fee paid: user=${userId}`);

      await Notification.create({
        userId,
        type: 'payment_success',
        title: 'Profile Payment Successful',
        message: 'Your ₹499 founder profile fee has been processed. You can now create your startup profile!',
        actionUrl: '/dashboard/founder',
        metadata: { paymentId: payment._id.toString(), purpose: 'founder_profile' },
      });
      break;
    }

    case 'boost_subscription': {
      // Activate boost on user's startup
      const startup = await Startup.findOne({ founderId: userId });
      if (startup) {
        const boostEnd = new Date();
        boostEnd.setDate(boostEnd.getDate() + 30); // 30-day boost

        startup.isBoosted = true;
        startup.boostExpiresAt = boostEnd;
        await startup.save();

        // Update/create subscription record
        await Subscription.findOneAndUpdate(
          { userId },
          {
            $set: {
              plan: 'pro_founder',
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: boostEnd,
              features: {
                ...FOUNDER_PLAN_FEATURES.pro_founder,
                mentorAccess: true,
                aiReports: true,
              },
            },
          },
          { upsert: true }
        );

        log.info(`Startup boosted: startup=${startup._id}, until=${boostEnd.toISOString()}`);
      }

      await Notification.create({
        userId,
        type: 'subscription_update',
        title: 'Startup Boost Activated! 🚀',
        message: 'Your startup is now boosted with increased visibility, AI insights, and mentor access.',
        actionUrl: '/dashboard/founder',
        metadata: { paymentId: payment._id.toString(), purpose: 'boost_subscription' },
      });
      break;
    }

    case 'ai_report': {
      await Notification.create({
        userId,
        type: 'payment_success',
        title: 'AI Report Unlocked',
        message: 'Your AI Market Validation Report is being generated. Check your dashboard shortly.',
        actionUrl: '/dashboard/founder',
        metadata: { paymentId: payment._id.toString(), purpose: 'ai_report' },
      });
      break;
    }

    case 'mentor_session': {
      // Mentor session booking is confirmed in the mentor-session API
      await Notification.create({
        userId,
        type: 'payment_success',
        title: 'Mentor Session Booked',
        message: 'Your mentor session has been confirmed. Check your dashboard for meeting details.',
        actionUrl: '/dashboard/founder',
        metadata: { paymentId: payment._id.toString(), purpose: 'mentor_session' },
      });
      break;
    }

    default:
      log.info(`No side effects for purpose: ${purpose}`);
  }
}
