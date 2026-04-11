import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Subscription, Startup, Payment, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import {
  createSubscription as createRzpSubscription,
  cancelSubscription as cancelRzpSubscription,
  fetchSubscription as fetchRzpSubscription,
} from '@/lib/payments/razorpay';
import { RAZORPAY_PLAN_IDS, SUBSCRIPTION_GRACE_PERIOD_DAYS } from '@/lib/payments/constants';
import { FOUNDER_PLAN_FEATURES } from '@/lib/subscription/features';
import { createLogger } from '@/lib/logger';

const log = createLogger('payments:subscription');

/**
 * GET /api/payments/subscription
 * Returns the current user's subscription status.
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    await connectDB();

    const subscription = await Subscription.findOne({ userId: payload.userId }).lean();
    const startup = await Startup.findOne({ founderId: payload.userId }).select('isBoosted boostExpiresAt').lean();

    // Check if the founder has paid the ₹499 profile fee
    const profilePayment = await Payment.findOne({
      fromUserId: payload.userId,
      purpose: 'founder_profile',
      status: 'completed',
    }).lean();

    // Check if grandfathered (has existing startup = already paid implicitly)
    const isGrandfathered = !profilePayment && startup;

    return NextResponse.json({
      success: true,
      subscription: subscription || null,
      isBoosted: (startup as any)?.isBoosted || false,
      boostExpiresAt: (startup as any)?.boostExpiresAt || null,
      hasProfilePayment: !!profilePayment || !!isGrandfathered,
      plan: subscription?.plan || 'free_founder',
      status: subscription?.status || 'active',
    });
  } catch (error) {
    log.error('Get subscription error', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

/**
 * POST /api/payments/subscription
 * Creates a Razorpay subscription for Startup Boost (₹1,999/month).
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (payload.role !== 'founder') {
      return NextResponse.json({ error: 'Only founders can subscribe' }, { status: 403 });
    }

    await connectDB();

    // Check if user already has an active subscription
    const existing = await Subscription.findOne({
      userId: payload.userId,
      status: { $in: ['active', 'trialing'] },
      razorpaySubscriptionId: { $exists: true, $ne: null },
    });
    if (existing) {
      return NextResponse.json({
        error: 'You already have an active subscription',
        subscription: existing,
      }, { status: 409 });
    }

    // Create Razorpay subscription
    const rzpSubscription = await createRzpSubscription({
      planId: RAZORPAY_PLAN_IDS.startup_boost_monthly,
      notes: {
        userId: payload.userId,
        purpose: 'boost_subscription',
      },
    });

    // Save subscription record
    const subscription = await Subscription.findOneAndUpdate(
      { userId: payload.userId },
      {
        $set: {
          role: 'founder',
          plan: 'pro_founder',
          status: 'incomplete', // Will be activated on first payment via webhook
          razorpaySubscriptionId: rzpSubscription.id,
          razorpayPlanId: RAZORPAY_PLAN_IDS.startup_boost_monthly,
          billingCycle: 'monthly',
          features: {
            ...FOUNDER_PLAN_FEATURES.pro_founder,
            mentorAccess: true,
            aiReports: true,
          },
        },
      },
      { upsert: true, new: true }
    );

    log.info(`Subscription created: ${rzpSubscription.id}, user=${payload.userId}`);

    return NextResponse.json({
      success: true,
      subscriptionId: rzpSubscription.id,
      shortUrl: rzpSubscription.short_url,
      subscription,
    });
  } catch (error) {
    log.error('Create subscription error', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

/**
 * DELETE /api/payments/subscription
 * Cancels the user's subscription (with grace period).
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    await connectDB();

    const subscription = await Subscription.findOne({
      userId: payload.userId,
      status: { $in: ['active', 'trialing', 'past_due'] },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel on Razorpay (at end of billing cycle)
    if (subscription.razorpaySubscriptionId) {
      await cancelRzpSubscription(subscription.razorpaySubscriptionId, true);
    }

    // Set grace period
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + SUBSCRIPTION_GRACE_PERIOD_DAYS);

    subscription.cancelAtPeriodEnd = true;
    subscription.gracePeriodEnd = gracePeriodEnd;
    await subscription.save();

    log.info(`Subscription cancelled: ${subscription.razorpaySubscriptionId}, user=${payload.userId}`);

    await Notification.create({
      userId: payload.userId,
      type: 'subscription_cancelled',
      title: 'Subscription Cancelled',
      message: `Your Startup Boost subscription will remain active until ${subscription.currentPeriodEnd?.toLocaleDateString() || 'the end of your billing cycle'}.`,
      actionUrl: '/dashboard/founder',
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription will be cancelled at end of billing cycle',
      cancelAt: subscription.currentPeriodEnd,
      gracePeriodEnd,
    });
  } catch (error) {
    log.error('Cancel subscription error', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
