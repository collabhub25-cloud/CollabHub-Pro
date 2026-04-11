import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FundingDeal } from '@/lib/models/funding-deal.model';
import { FundingRound, User, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { createPaymentLink } from '@/lib/payments/razorpay';
import { FUNDRAISING_COMMISSION_PERCENT } from '@/lib/payments/constants';
import { createLogger } from '@/lib/logger';

const log = createLogger('payments:commission');

/**
 * GET /api/payments/commission
 * List commission records. Admins see all; founders see their own.
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();

    const query: Record<string, unknown> =
      payload.role === 'admin' ? {} : { startupId: { $exists: true } };

    // For non-admins, only show deals related to their startups
    if (payload.role !== 'admin') {
      const { Startup } = await import('@/lib/models');
      const userStartups = await Startup.find({ founderId: payload.userId }).select('_id').lean();
      const startupIds = userStartups.map((s: any) => s._id);
      query.startupId = { $in: startupIds };
    }

    const deals = await FundingDeal.find(query)
      .populate('startupId', 'name')
      .populate('investorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, deals });
  } catch (error) {
    log.error('List commissions error', error);
    return NextResponse.json({ error: 'Failed to list commissions' }, { status: 500 });
  }
}

/**
 * POST /api/payments/commission
 * Generate a fundraising commission invoice after deal closure.
 * Admin/system-triggered endpoint.
 *
 * Body: { fundingRoundId, investorId, dealAmount }
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Only admins can generate commission invoices
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { fundingRoundId, investorId, dealAmount } = body;

    if (!fundingRoundId || !investorId || !dealAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify funding round
    const fundingRound = await FundingRound.findById(fundingRoundId).lean() as any;
    if (!fundingRound) {
      return NextResponse.json({ error: 'Funding round not found' }, { status: 404 });
    }

    // Check for duplicate commission
    const existing = await FundingDeal.findOne({ fundingRoundId, investorId });
    if (existing) {
      return NextResponse.json({ error: 'Commission already generated for this deal' }, { status: 409 });
    }

    const commissionAmount = Math.round(dealAmount * (FUNDRAISING_COMMISSION_PERCENT / 100));

    // Get founder details for payment link
    const { Startup } = await import('@/lib/models');
    const startup = (await Startup.findById(fundingRound.startupId).populate('founderId', 'name email').lean()) as any;
    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    const founder = startup.founderId as any;

    // Create Razorpay payment link
    let paymentLink;
    try {
      paymentLink = await createPaymentLink({
        amount: commissionAmount,
        description: `AlloySphere ${FUNDRAISING_COMMISSION_PERCENT}% fundraising commission for ${startup.name}`,
        customer: {
          name: founder.name,
          email: founder.email,
        },
        notes: {
          fundingRoundId: fundingRoundId.toString(),
          startupId: fundingRound.startupId.toString(),
          investorId,
          type: 'fundraising_commission',
        },
      });
    } catch (err: unknown) {
      log.warn('Failed to create payment link, creating deal without it', err as Record<string, unknown>);
    }

    // Create funding deal record
    const deal = await FundingDeal.create({
      fundingRoundId,
      startupId: fundingRound.startupId,
      investorId,
      dealAmount,
      commissionPercent: FUNDRAISING_COMMISSION_PERCENT,
      commissionAmount,
      razorpayPaymentLinkId: paymentLink?.id,
      razorpayPaymentLinkUrl: paymentLink?.short_url,
      status: paymentLink ? 'invoiced' : 'pending',
      invoicedAt: paymentLink ? new Date() : undefined,
    });

    log.info(`Commission generated: deal=${deal._id}, amount=₹${commissionAmount / 100}`);

    // Notify founder
    await Notification.create({
      userId: founder._id.toString(),
      type: 'commission_invoice',
      title: 'Fundraising Commission Invoice',
      message: `A ${FUNDRAISING_COMMISSION_PERCENT}% commission of ₹${commissionAmount / 100} has been generated for your successful fundraising round.`,
      actionUrl: paymentLink?.short_url || '/dashboard/founder',
      metadata: { dealId: deal._id.toString(), amount: commissionAmount },
    });

    return NextResponse.json({
      success: true,
      deal,
      paymentLink: paymentLink?.short_url || null,
    });
  } catch (error) {
    log.error('Create commission error', error);
    return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 });
  }
}
