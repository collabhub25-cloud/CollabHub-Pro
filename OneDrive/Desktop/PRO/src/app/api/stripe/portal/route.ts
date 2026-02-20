import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Subscription, User } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// POST /api/stripe/portal - Create Stripe billing portal session
// ONLY FOUNDERS CAN ACCESS BILLING PORTAL
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

    // Check user role
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // CRITICAL: Only founders can access billing portal
    if (user.role !== 'founder') {
      return NextResponse.json(
        {
          error: 'Billing is only available for founders. Talent and Investor accounts are free.',
          code: 'BILLING_FOUNDER_ONLY'
        },
        { status: 403 }
      );
    }

    const subscription = await Subscription.findOne({ userId: decoded.userId });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`,
    });

    return NextResponse.json({
      portalUrl: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
