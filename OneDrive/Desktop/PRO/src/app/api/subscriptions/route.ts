import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Subscription } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { 
  FounderPlanType, 
  FOUNDER_PLAN_FEATURES, 
  roleRequiresSubscription,
  getDefaultPlanForRole
} from '@/lib/subscription/features';

// Founder Plan configurations
const FOUNDER_PLANS = {
  free_founder: {
    name: 'Free',
    price: 0,
    features: FOUNDER_PLAN_FEATURES.free_founder,
  },
  pro_founder: {
    name: 'Pro',
    price: 2900, // $29
    priceId: 'price_pro_founder_monthly',
    features: FOUNDER_PLAN_FEATURES.pro_founder,
  },
  scale_founder: {
    name: 'Scale',
    price: 9900, // $99
    priceId: 'price_scale_founder_monthly',
    features: FOUNDER_PLAN_FEATURES.scale_founder,
  },
  enterprise_founder: {
    name: 'Enterprise',
    price: 29900, // $299
    priceId: 'price_enterprise_founder_monthly',
    features: FOUNDER_PLAN_FEATURES.enterprise_founder,
  },
};

// GET /api/subscriptions - Get user's subscription
export async function GET(request: NextRequest) {
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

    // Non-founders don't need subscriptions - return free access
    if (user.role !== 'founder') {
      return NextResponse.json({
        subscription: null,
        planDetails: {
          name: 'Free',
          price: 0,
          features: {
            message: 'Full access to all features for free',
          },
        },
        isFreeAccount: true,
        message: 'Talent and Investor accounts are free with full access.',
      });
    }

    // Founders: Get or create subscription
    let subscription = await Subscription.findOne({ userId: decoded.userId });

    if (!subscription) {
      subscription = await Subscription.create({
        userId: decoded.userId,
        role: 'founder',
        plan: 'free_founder',
        status: 'active',
        features: FOUNDER_PLANS.free_founder.features,
      });
    }

    return NextResponse.json({
      subscription,
      planDetails: FOUNDER_PLANS[subscription.plan as FounderPlanType] || FOUNDER_PLANS.free_founder,
      isFreeAccount: false,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions/plans - Get available plans for a role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role } = body;

    // Non-founders don't have subscription plans
    if (role !== 'founder') {
      return NextResponse.json({
        plans: {
          free: {
            name: 'Free',
            price: 0,
            features: {
              message: 'Full access to all features for free',
            },
          },
        },
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} accounts are free with full access.`,
      });
    }

    // Founders: Return all founder plans
    return NextResponse.json({
      plans: FOUNDER_PLANS,
      message: 'Choose a plan to unlock more features.',
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
