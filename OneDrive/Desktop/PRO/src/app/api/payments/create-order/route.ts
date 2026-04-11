import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Payment, User, Startup } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { createOrder } from '@/lib/payments/razorpay';
import {
  FOUNDER_PROFILE_FEE,
  STARTUP_BOOST_MONTHLY,
  PAYMENT_PURPOSE_AMOUNTS,
  type PaymentPurpose,
} from '@/lib/payments/constants';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger('payments:create-order');

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for any payment purpose.
 *
 * Body: { purpose: PaymentPurpose, amount?: number, metadata?: object }
 * Returns: { orderId, amount, currency, key, paymentRecordId }
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

    await connectDB();

    const body = await request.json();
    const { purpose, amount: customAmount, metadata } = body as {
      purpose: PaymentPurpose;
      amount?: number;
      metadata?: Record<string, string>;
    };

    // Validate purpose
    const validPurposes: PaymentPurpose[] = [
      'founder_profile', 'boost_subscription', 'ai_report', 'mentor_session', 'fundraising_commission',
    ];
    if (!purpose || !validPurposes.includes(purpose)) {
      return NextResponse.json({ error: 'Invalid payment purpose' }, { status: 400 });
    }

    // Determine amount
    let amount = PAYMENT_PURPOSE_AMOUNTS[purpose] || customAmount;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // Purpose-specific validation
    if (purpose === 'founder_profile') {
      if (payload.role !== 'founder') {
        return NextResponse.json({ error: 'Only founders can create startup profiles' }, { status: 403 });
      }

      // Check if user already paid for profile
      const existingPayment = await Payment.findOne({
        fromUserId: payload.userId,
        purpose: 'founder_profile',
        status: 'completed',
      });
      if (existingPayment) {
        return NextResponse.json({ error: 'Profile creation fee already paid' }, { status: 409 });
      }

      // Check if founder is grandfathered (has existing startup)
      const existingStartup = await Startup.findOne({ founderId: payload.userId });
      if (existingStartup) {
        return NextResponse.json({ error: 'You already have a startup profile' }, { status: 409 });
      }

      amount = FOUNDER_PROFILE_FEE;
    }

    if (purpose === 'boost_subscription') {
      if (payload.role !== 'founder') {
        return NextResponse.json({ error: 'Only founders can boost startups' }, { status: 403 });
      }
      amount = STARTUP_BOOST_MONTHLY;
    }

    // Generate idempotency key (prevents duplicate orders within 10 min window)
    const idempotencyKey = `${payload.userId}:${purpose}:${Math.floor(Date.now() / 600000)}`;

    // Check for existing pending order with same idempotency key
    const existingOrder = await Payment.findOne({
      idempotencyKey,
      status: 'pending',
    });
    if (existingOrder && existingOrder.razorpayOrderId) {
      // Return existing order instead of creating duplicate
      return NextResponse.json({
        success: true,
        orderId: existingOrder.razorpayOrderId,
        amount: existingOrder.amount,
        currency: existingOrder.currency,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        paymentRecordId: existingOrder._id.toString(),
      });
    }

    // Create Razorpay order
    const receipt = `${purpose}_${payload.userId}_${Date.now()}`;
    const order = await createOrder({
      amount,
      receipt,
      notes: {
        userId: payload.userId,
        purpose,
        ...(metadata || {}),
      },
    });

    // Create payment record
    const paymentRecord = await Payment.create({
      type: purpose === 'boost_subscription' ? 'subscription' : 'one_time',
      purpose,
      amount,
      currency: 'INR',
      status: 'pending',
      fromUserId: payload.userId,
      razorpayOrderId: order.id,
      idempotencyKey,
      metadata: metadata || {},
    });

    log.info(`Order created: ${order.id} for ${purpose}, user=${payload.userId}`);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount,
      currency: 'INR',
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      paymentRecordId: paymentRecord._id.toString(),
    });
  } catch (error) {
    log.error('Create order error', error);
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
  }
}
