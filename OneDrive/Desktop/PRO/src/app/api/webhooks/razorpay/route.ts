import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Payment, Startup, Subscription, Notification } from '@/lib/models';
import { MentorSession } from '@/lib/models/mentor-session.model';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';
import { FOUNDER_PLAN_FEATURES } from '@/lib/subscription/features';
import { SUBSCRIPTION_GRACE_PERIOD_DAYS } from '@/lib/payments/constants';
import { createLogger } from '@/lib/logger';

const log = createLogger('webhooks:razorpay');

/**
 * POST /api/webhooks/razorpay
 * Razor webhook handler. This is a PUBLIC route (no auth/CSRF).
 * Signature verification ensures only Razorpay can call this.
 *
 * Events handled:
 * - payment.captured
 * - payment.failed
 * - subscription.charged
 * - subscription.cancelled
 * - subscription.halted
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      log.warn('Webhook signature verification FAILED');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event as string;
    const eventPayload = event.payload;

    log.info(`Webhook received: ${eventType}`);

    await connectDB();

    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(eventPayload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(eventPayload);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(eventPayload);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(eventPayload);
        break;

      case 'subscription.halted':
        await handleSubscriptionHalted(eventPayload);
        break;

      default:
        log.info(`Unhandled webhook event: ${eventType}`);
    }

    // Always return 200 to Razorpay (even for unhandled events)
    return NextResponse.json({ success: true, event: eventType });
  } catch (error) {
    log.error('Webhook processing error', error);
    // Return 200 anyway to prevent Razorpay retries for transient errors
    // Real failures are logged and can be investigated
    return NextResponse.json({ success: true, processed: false });
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handlePaymentCaptured(payload: any) {
  const paymentEntity = payload.payment?.entity;
  if (!paymentEntity) return;

  const orderId = paymentEntity.order_id;
  const paymentId = paymentEntity.id;

  // Find and update payment record
  const payment = await Payment.findOne({ razorpayOrderId: orderId });

  if (!payment) {
    log.warn(`Payment record not found for captured payment: order=${orderId}`);
    return;
  }

  // Idempotency: skip if already completed
  if (payment.status === 'completed') {
    log.info(`Payment already completed, skipping: order=${orderId}`);
    return;
  }

  payment.status = 'completed';
  payment.razorpayPaymentId = paymentId;
  payment.verifiedAt = new Date();
  await payment.save();

  log.info(`Payment captured via webhook: order=${orderId}, purpose=${payment.purpose}`);

  // Trigger side effects based on purpose
  const userId = payment.fromUserId.toString();

  switch (payment.purpose) {
    case 'founder_profile': {
      await Notification.create({
        userId,
        type: 'payment_success',
        title: 'Profile Payment Confirmed',
        message: 'Your ₹499 founder profile payment has been confirmed. Create your startup now!',
        actionUrl: '/dashboard/founder',
      });
      break;
    }
    case 'boost_subscription': {
      const startup = await Startup.findOne({ founderId: userId });
      if (startup) {
        const boostEnd = new Date();
        boostEnd.setDate(boostEnd.getDate() + 30);
        startup.isBoosted = true;
        startup.boostExpiresAt = boostEnd;
        await startup.save();
      }
      break;
    }
    case 'mentor_session': {
      // Confirm the mentor session booking
      if (payment.razorpayOrderId) {
        await MentorSession.findOneAndUpdate(
          { razorpayOrderId: payment.razorpayOrderId },
          { $set: { paymentStatus: 'completed', status: 'booked' } }
        );
      }
      break;
    }
  }
}

async function handlePaymentFailed(payload: any) {
  const paymentEntity = payload.payment?.entity;
  if (!paymentEntity) return;

  const orderId = paymentEntity.order_id;
  const paymentId = paymentEntity.id;
  const errorCode = paymentEntity.error_code;
  const errorDescription = paymentEntity.error_description;

  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) return;

  // Don't overwrite completed payments
  if (payment.status === 'completed') return;

  payment.status = 'failed';
  payment.razorpayPaymentId = paymentId;
  payment.failureReason = `${errorCode}: ${errorDescription}`;
  await payment.save();

  log.warn(`Payment failed: order=${orderId}, reason=${errorDescription}`);

  const userId = payment.fromUserId.toString();
  await Notification.create({
    userId,
    type: 'payment_failed',
    title: 'Payment Failed',
    message: `Your payment of ₹${payment.amount / 100} failed. ${errorDescription || 'Please try again.'}`,
    actionUrl: '/pricing',
    metadata: { orderId, errorCode },
  });
}

async function handleSubscriptionCharged(payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  const paymentEntity = payload.payment?.entity;
  if (!subscriptionEntity) return;

  const subscriptionId = subscriptionEntity.id;

  const subscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
  if (!subscription) {
    log.warn(`Subscription not found for charge: ${subscriptionId}`);
    return;
  }

  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  subscription.status = 'active';
  subscription.currentPeriodStart = now;
  subscription.currentPeriodEnd = periodEnd;
  subscription.gracePeriodEnd = undefined;
  await subscription.save();

  // Re-activate boost on startup
  const userId = subscription.userId.toString();
  const startup = await Startup.findOne({ founderId: userId });
  if (startup) {
    startup.isBoosted = true;
    startup.boostExpiresAt = periodEnd;
    await startup.save();
  }

  log.info(`Subscription renewed: ${subscriptionId}, next period ends=${periodEnd.toISOString()}`);

  await Notification.create({
    userId,
    type: 'subscription_renewed',
    title: 'Subscription Renewed ✅',
    message: 'Your Startup Boost subscription has been renewed for another month.',
    actionUrl: '/dashboard/founder',
  });
}

async function handleSubscriptionCancelled(payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  if (!subscriptionEntity) return;

  const subscriptionId = subscriptionEntity.id;

  const subscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
  if (!subscription) return;

  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + SUBSCRIPTION_GRACE_PERIOD_DAYS);

  subscription.status = 'canceled';
  subscription.cancelAtPeriodEnd = true;
  subscription.gracePeriodEnd = gracePeriodEnd;
  await subscription.save();

  // Don't immediately remove boost — grace period
  log.info(`Subscription cancelled: ${subscriptionId}, grace until=${gracePeriodEnd.toISOString()}`);

  const userId = subscription.userId.toString();
  await Notification.create({
    userId,
    type: 'subscription_cancelled',
    title: 'Subscription Cancelled',
    message: `Your Startup Boost will remain active until ${gracePeriodEnd.toLocaleDateString()}.`,
    actionUrl: '/pricing',
  });
}

async function handleSubscriptionHalted(payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  if (!subscriptionEntity) return;

  const subscriptionId = subscriptionEntity.id;

  const subscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
  if (!subscription) return;

  subscription.status = 'halted';
  await subscription.save();

  // Deactivate boost
  const userId = subscription.userId.toString();
  const startup = await Startup.findOne({ founderId: userId });
  if (startup) {
    startup.isBoosted = false;
    startup.boostExpiresAt = undefined;
    await startup.save();
  }

  log.warn(`Subscription halted (payment method failed): ${subscriptionId}`);

  await Notification.create({
    userId,
    type: 'payment_failed',
    title: 'Subscription Payment Failed',
    message: 'Your subscription payment method has failed. Please update your payment details to continue your Startup Boost.',
    actionUrl: '/pricing',
  });
}
