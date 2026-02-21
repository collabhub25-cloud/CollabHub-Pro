import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Investment, FundingRound, Startup, User, Notification } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import Stripe from 'stripe';
import { createLogger } from '@/lib/logger';

const log = createLogger('funding-invest');

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// POST /api/funding/invest - Create investment with Stripe checkout
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

    // Verify investor role
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'investor') {
      return NextResponse.json(
        { error: 'Only investors can invest' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roundId, amount } = body;

    if (!roundId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid round ID and amount are required' },
        { status: 400 }
      );
    }

    // Get funding round
    const round = await FundingRound.findById(roundId).populate('startupId');
    if (!round) {
      return NextResponse.json(
        { error: 'Funding round not found' },
        { status: 404 }
      );
    }

    if (round.status !== 'open') {
      return NextResponse.json(
        { error: 'This funding round is not open for investments' },
        { status: 400 }
      );
    }

    if (amount < round.minInvestment) {
      return NextResponse.json(
        { error: `Minimum investment is $${round.minInvestment.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Check if round has enough capacity
    const remainingCapacity = round.targetAmount - round.raisedAmount;
    if (amount > remainingCapacity) {
      return NextResponse.json(
        { error: `Maximum investment allowed is $${remainingCapacity.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Calculate equity
    const equityPercent = (amount / round.valuation) * 100;

    // Create pending investment
    const investment = await Investment.create({
      investorId: decoded.userId,
      startupId: round.startupId._id,
      fundingRoundId: roundId,
      amount,
      equityPercent,
      status: 'pending',
    });

    // Create Stripe checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Investment in ${(round.startupId as any).name}`,
              description: `${round.roundName} - ${equityPercent.toFixed(4)}% equity`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/dashboard?investment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/dashboard?investment=cancelled`,
      metadata: {
        investmentId: investment._id.toString(),
        roundId,
        startupId: round.startupId._id.toString(),
        investorId: decoded.userId,
      },
    });

    // Update investment with checkout session ID
    investment.stripeCheckoutSessionId = checkoutSession.id;
    await investment.save();

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      investment: {
        _id: investment._id,
        amount: investment.amount,
        equityPercent: investment.equityPercent,
        status: investment.status,
      },
    });
  } catch (error) {
    log.error('Error creating investment:', error);
    return NextResponse.json(
      { error: 'Failed to create investment' },
      { status: 500 }
    );
  }
}

// GET /api/funding/invest - Get user's investments
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

    const investments = await Investment.find({ investorId: decoded.userId })
      .populate('startupId', 'name industry stage logo')
      .populate('fundingRoundId', 'roundName status')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      investments,
      total: investments.length,
    });
  } catch (error) {
    log.error('Error fetching investments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}
