import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Subscription } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { validateInput, CheckoutSchema } from '@/lib/validation/schemas';
import { env } from '@/lib/env';
import { FounderPlanType, PLAN_PRICES } from '@/lib/subscription/features';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// Stripe Price IDs for Founder Plans
const STRIPE_PRICES: Record<FounderPlanType, string> = {
  free_founder: '', // No Stripe price for free plan
  pro_founder: 'price_pro_founder_monthly',
  scale_founder: 'price_scale_founder_monthly',
  enterprise_founder: 'price_enterprise_founder_monthly',
};

// Legacy mapping for backward compatibility
const LEGACY_TO_FOUNDER_PLAN: Record<string, FounderPlanType> = {
  pro: 'pro_founder',
  scale: 'scale_founder',
  premium: 'enterprise_founder',
};

// POST /api/stripe/checkout - Create Stripe checkout session
// ONLY FOUNDERS CAN CREATE CHECKOUT SESSIONS
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

    // CRITICAL: Only founders can create Stripe checkout sessions
    if (user.role !== 'founder') {
      return NextResponse.json(
        {
          error: 'Subscription plans are only available for founders. Talent and Investor accounts are free.',
          code: 'BILLING_FOUNDER_ONLY'
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Zod validation
    const validation = validateInput(CheckoutSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    let plan: string = validation.data.plan;

    // Map legacy plan names to founder plans
    if (plan in LEGACY_TO_FOUNDER_PLAN) {
      plan = LEGACY_TO_FOUNDER_PLAN[plan as keyof typeof LEGACY_TO_FOUNDER_PLAN];
    }

    if (!plan || (plan as string) === 'free' || (plan as string) === 'free_founder') {
      return NextResponse.json(
        { error: 'Invalid plan selected. Please select a paid plan.' },
        { status: 400 }
      );
    }

    // Verify plan is a valid founder plan
    const founderPlans: FounderPlanType[] = ['pro_founder', 'scale_founder', 'enterprise_founder'];
    if (!founderPlans.includes(plan as FounderPlanType)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let subscription = await Subscription.findOne({ userId: decoded.userId });
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: decoded.userId,
          role: 'founder', // Always founder at this point
        },
      });
      customerId = customer.id;
    }

    // Get price ID
    const priceId = STRIPE_PRICES[plan as FounderPlanType];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan not configured for checkout' },
        { status: 400 }
      );
    }

    // Create checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?subscription=cancelled`,
      metadata: {
        userId: decoded.userId,
        plan: plan,
        role: 'founder', // Always founder at this point
      },
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
