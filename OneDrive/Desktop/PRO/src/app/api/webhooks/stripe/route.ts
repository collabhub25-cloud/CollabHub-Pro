import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectDB } from '@/lib/mongodb';
import { Milestone, Payment, User, TrustScoreLog, Subscription, Notification, WebhookEvent } from '@/lib/models';
import { env } from '@/lib/env';
import { FOUNDER_PLAN_FEATURES, FounderPlanType } from '@/lib/subscription/features';
import { createLogger } from '@/lib/logger';

const log = createLogger('stripe-webhooks');

// Lazy Stripe initialization — prevents crash during `next build` page data collection
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// SECURITY FIX: Use database-backed webhook deduplication instead of in-memory Set
// This ensures webhooks are not processed multiple times even across server restarts

/**
 * Check if webhook event has already been processed
 */
async function isWebhookProcessed(eventId: string): Promise<boolean> {
  const existing = await WebhookEvent.findOne({ eventId });
  return !!existing;
}

/**
 * Mark webhook event as processed
 */
async function markWebhookProcessed(eventId: string, eventType: string): Promise<void> {
  await WebhookEvent.create({
    eventId,
    eventType,
    processedAt: new Date(),
  });
}

// Map Stripe plan names to FounderPlanType
const PLAN_MAPPING: Record<string, FounderPlanType> = {
  pro: 'pro_founder',
  pro_founder: 'pro_founder',
  scale: 'scale_founder',
  scale_founder: 'scale_founder',
  premium: 'enterprise_founder',
  enterprise_founder: 'enterprise_founder',
};

// Stripe webhook handler
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe signature');
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      );
    }

    // SECURITY FIX: Verify webhook signature instead of just parsing JSON
    let event: Stripe.Event;

    try {
      const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        );
      }

      // Construct and verify the event using Stripe's signature verification
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      log.error('Webhook signature verification failed', err);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${error.message}` },
        { status: 400 }
      );
    }

    const eventId = event.id;

    // SECURITY FIX: Database-backed idempotency check
    if (await isWebhookProcessed(eventId)) {
      log.warn(`Webhook already processed: ${eventId}`);
      return NextResponse.json({ received: true });
    }

    log.info(`Webhook received: ${event.type} (${eventId})`);

    // Handle different event types
    switch (event.type) {
      // ============================================
      // SUBSCRIPTION EVENTS - FOUNDER ONLY
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const { userId, plan, role } = metadata;

        // CRITICAL: Only process subscription events for founders
        if (role && role !== 'founder') {
          log.warn(`Ignoring subscription event for non-founder role: ${role}`);
          break;
        }

        if (userId && plan) {
          // Map plan to founder plan
          const founderPlan = PLAN_MAPPING[plan] || plan as FounderPlanType;

          // Get user to verify they are a founder
          const user = await User.findById(userId);
          if (!user || user.role !== 'founder') {
            log.warn(`Ignoring subscription event for non-founder user: ${userId}`);
            break;
          }

          // Create or update subscription
          const existingSub = await Subscription.findOne({ userId });

          if (existingSub) {
            existingSub.plan = founderPlan;
            existingSub.status = 'active';
            existingSub.stripeCustomerId = session.customer as string;
            existingSub.stripeSubscriptionId = session.subscription as string;
            existingSub.currentPeriodStart = new Date();
            existingSub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            existingSub.features = FOUNDER_PLAN_FEATURES[founderPlan] || FOUNDER_PLAN_FEATURES.free_founder;
            await existingSub.save();
          } else {
            await Subscription.create({
              userId,
              role: 'founder',
              plan: founderPlan,
              status: 'active',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              features: FOUNDER_PLAN_FEATURES[founderPlan] || FOUNDER_PLAN_FEATURES.free_founder,
            });
          }

          // Create notification
          await Notification.create({
            userId,
            type: 'subscription_update',
            title: 'Subscription Activated',
            message: `Your ${founderPlan.replace('_founder', '')} subscription is now active. Enjoy your new features!`,
            metadata: { plan: founderPlan, sessionId: session.id },
          });

          log.info(`Founder subscription created: ${founderPlan} for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Verify this is for a founder
        const userSubscription = await Subscription.findOne({ stripeCustomerId: customerId });
        if (userSubscription) {
          // Verify user is founder
          const user = await User.findById(userSubscription.userId);
          if (!user || user.role !== 'founder') {
            log.warn(`Ignoring subscription created for non-founder`);
            break;
          }

          userSubscription.stripeSubscriptionId = subscription.id;
          userSubscription.status = subscription.status;
          const subAny = subscription as unknown as Record<string, number>;
          userSubscription.currentPeriodStart = new Date((subAny.current_period_start ?? Math.floor(Date.now() / 1000)) * 1000);
          userSubscription.currentPeriodEnd = new Date((subAny.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400) * 1000);
          await userSubscription.save();
          log.info(`Stripe subscription created: ${subscription.id}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userSubscription = await Subscription.findOne({ stripeCustomerId: customerId });
        if (userSubscription) {
          // Verify user is founder
          const user = await User.findById(userSubscription.userId);
          if (!user || user.role !== 'founder') {
            log.warn(`Ignoring subscription update for non-founder`);
            break;
          }

          userSubscription.status = subscription.status;
          userSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
          const subAny2 = subscription as unknown as Record<string, number>;
          userSubscription.currentPeriodStart = new Date((subAny2.current_period_start ?? Math.floor(Date.now() / 1000)) * 1000);
          userSubscription.currentPeriodEnd = new Date((subAny2.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400) * 1000);
          await userSubscription.save();

          // Notify user if subscription status changed
          if (subscription.status === 'past_due') {
            await Notification.create({
              userId: userSubscription.userId.toString(),
              type: 'subscription_update',
              title: 'Payment Issue',
              message: 'Your subscription payment failed. Please update your payment method.',
              metadata: { status: subscription.status },
            });
          }
        }

        log.info(`Subscription updated: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userSubscription = await Subscription.findOne({ stripeCustomerId: customerId });
        if (userSubscription) {
          // Verify user is founder
          const user = await User.findById(userSubscription.userId);
          if (!user || user.role !== 'founder') {
            log.warn(`Ignoring subscription deletion for non-founder`);
            break;
          }

          userSubscription.status = 'canceled';
          userSubscription.plan = 'free_founder';
          userSubscription.features = FOUNDER_PLAN_FEATURES.free_founder;
          await userSubscription.save();

          // Notify user
          await Notification.create({
            userId: userSubscription.userId.toString(),
            type: 'subscription_update',
            title: 'Subscription Cancelled',
            message: 'Your subscription has been cancelled. You are now on the Free plan.',
            metadata: { status: 'canceled' },
          });
        }

        log.info(`Subscription cancelled: ${subscription.id}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (invoice.billing_reason === 'subscription_cycle') {
          const userSubscription = await Subscription.findOne({ stripeCustomerId: customerId });
          if (userSubscription) {
            // Verify user is founder
            const user = await User.findById(userSubscription.userId);
            if (!user || user.role !== 'founder') {
              log.warn(`Ignoring payment success for non-founder`);
              break;
            }

            userSubscription.currentPeriodStart = new Date(invoice.period_start * 1000);
            userSubscription.currentPeriodEnd = new Date(invoice.period_end * 1000);
            userSubscription.status = 'active';
            await userSubscription.save();

            await Notification.create({
              userId: userSubscription.userId.toString(),
              type: 'subscription_update',
              title: 'Payment Successful',
              message: 'Your subscription payment was successful. Thank you for your continued support!',
            });
          }
        }

        log.info(`Invoice paid: ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const userSubscription = await Subscription.findOne({ stripeCustomerId: customerId });
        if (userSubscription) {
          // Verify user is founder
          const user = await User.findById(userSubscription.userId);
          if (!user || user.role !== 'founder') {
            log.warn(`Ignoring payment failure for non-founder`);
            break;
          }

          userSubscription.status = 'past_due';
          await userSubscription.save();

          await Notification.create({
            userId: userSubscription.userId.toString(),
            type: 'subscription_update',
            title: 'Payment Failed',
            message: 'Your subscription payment failed. Please update your payment method to avoid service interruption.',
            metadata: { attempt: invoice.attempt_count },
          });
        }

        log.info(`Invoice payment failed: ${invoice.id}`);
        break;
      }

      // ============================================
      // PAYMENT EVENTS (Milestone, Investment)
      // ============================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Check if this payment was already processed (idempotency)
        const existingPayment = await Payment.findOne({
          stripePaymentId: paymentIntent.id,
        });

        if (existingPayment) {
          log.warn(`Payment already processed: ${paymentIntent.id}`);
          break;
        }

        const metadata = paymentIntent.metadata || {};
        const { milestoneId, startupId, fromUserId, toUserId, type } = metadata;

        // Create payment record
        const payment = await Payment.create({
          type: type || 'milestone',
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
          status: 'completed',
          fromUserId: fromUserId || null,
          toUserId: toUserId || null,
          startupId: startupId || null,
          milestoneId: milestoneId || null,
          stripePaymentId: paymentIntent.id,
          platformFee: Math.round(paymentIntent.amount * 0.05) / 100,
          metadata,
        });

        // If milestone payment, update milestone status
        if (milestoneId) {
          await Milestone.findByIdAndUpdate(milestoneId, {
            $set: {
              escrowStatus: 'funded',
              updatedAt: new Date(),
            },
          });

          // Update trust score
          if (toUserId) {
            await TrustScoreLog.create({
              userId: toUserId,
              startupId,
              scoreChange: 3,
              reason: 'Milestone payment received',
              category: 'milestone',
            });

            await User.findByIdAndUpdate(toUserId, {
              $inc: { trustScore: 3 },
            });
          }
        }

        // Create notification
        if (toUserId) {
          await Notification.create({
            userId: toUserId,
            type: 'payment_success',
            title: 'Payment Received',
            message: `Payment of $${payment.amount} ${payment.currency} has been received.`,
            metadata: { paymentId: payment._id },
          });
        }

        log.info(`Payment processed: $${payment.amount} ${payment.currency}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await Payment.findOneAndUpdate(
          { stripePaymentId: paymentIntent.id },
          { $set: { status: 'failed', updatedAt: new Date() } }
        );

        log.info(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;

        await Payment.findOneAndUpdate(
          { stripePaymentId: charge.payment_intent as string },
          { $set: { status: 'refunded', updatedAt: new Date() } }
        );

        log.info(`Payment refunded: ${charge.payment_intent}`);
        break;
      }

      default:
        log.warn(`Unhandled event type: ${event.type}`);
    }

    // SECURITY FIX: Mark webhook as processed in database
    await markWebhookProcessed(eventId, event.type);

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error('Webhook processing error', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check webhook configuration
export async function GET() {
  return NextResponse.json({
    configured: !!env.STRIPE_WEBHOOK_SECRET,
    message: env.STRIPE_WEBHOOK_SECRET
      ? 'Webhook endpoint is configured'
      : 'Webhook secret not configured',
  });
}
