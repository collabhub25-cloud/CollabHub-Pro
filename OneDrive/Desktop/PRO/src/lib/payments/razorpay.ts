/**
 * Razorpay Service Layer
 * Centralized integration with Razorpay APIs.
 * All payment verification MUST happen server-side — never trust frontend.
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { CURRENCY } from './constants';
import { createLogger } from '@/lib/logger';

const log = createLogger('razorpay');

// ============================================
// INITIALIZATION
// ============================================

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  log.warn('Razorpay keys not configured — payment features will fail');
}

let razorpayInstance: InstanceType<typeof Razorpay> | null = null;

function getRazorpay(): InstanceType<typeof Razorpay> {
  if (!razorpayInstance) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys are not configured');
    }
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

// ============================================
// ORDER CREATION
// ============================================

export interface CreateOrderParams {
  amount: number; // in paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  notes: Record<string, string>;
}

/**
 * Create a Razorpay Order.
 * Amount must be in paise (e.g., ₹499 = 49900).
 */
export async function createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  const razorpay = getRazorpay();

  const options = {
    amount: params.amount,
    currency: params.currency || CURRENCY,
    receipt: params.receipt,
    notes: params.notes || {},
  };

  log.info(`Creating order: ₹${params.amount / 100}, receipt=${params.receipt}`);

  try {
    const order = await razorpay.orders.create(options) as unknown as RazorpayOrder;
    log.info(`Order created: ${order.id}`);
    return order;
  } catch (error) {
    log.error('Failed to create Razorpay order', error);
    throw new Error('Failed to create payment order');
  }
}

// ============================================
// PAYMENT SIGNATURE VERIFICATION (CRITICAL)
// ============================================

/**
 * Verify Razorpay payment signature using HMAC SHA256.
 * This MUST be called server-side before trusting any payment.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    log.error('Cannot verify signature: RAZORPAY_KEY_SECRET not set');
    return false;
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!isValid) {
    log.warn(`Signature verification FAILED for order=${orderId}, payment=${paymentId}`);
  }

  return isValid;
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

export interface CreateSubscriptionParams {
  planId: string;
  totalCount?: number; // Number of billing cycles (0 = infinite)
  notes?: Record<string, string>;
  customerId?: string;
}

export interface RazorpaySubscription {
  id: string;
  entity: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  short_url: string;
}

/**
 * Create a Razorpay Subscription.
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<RazorpaySubscription> {
  const razorpay = getRazorpay();

  const options: Record<string, unknown> = {
    plan_id: params.planId,
    total_count: params.totalCount || 0, // 0 = unlimited billing cycles
    notes: params.notes || {},
  };

  if (params.customerId) {
    options.customer_id = params.customerId;
  }

  log.info(`Creating subscription for plan=${params.planId}`);

  try {
    const subscription = await razorpay.subscriptions.create(options as any) as unknown as RazorpaySubscription;
    log.info(`Subscription created: ${subscription.id}`);
    return subscription;
  } catch (error) {
    log.error('Failed to create Razorpay subscription', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Cancel a Razorpay Subscription.
 * @param cancelAtCycleEnd - If true, subscription remains active until current billing cycle ends.
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true
): Promise<RazorpaySubscription> {
  const razorpay = getRazorpay();

  log.info(`Cancelling subscription: ${subscriptionId}, atCycleEnd=${cancelAtCycleEnd}`);

  try {
    const subscription = await razorpay.subscriptions.cancel(
      subscriptionId,
      cancelAtCycleEnd
    ) as unknown as RazorpaySubscription;
    log.info(`Subscription cancelled: ${subscriptionId}`);
    return subscription;
  } catch (error) {
    log.error('Failed to cancel subscription', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Fetch subscription details.
 */
export async function fetchSubscription(
  subscriptionId: string
): Promise<RazorpaySubscription> {
  const razorpay = getRazorpay();

  try {
    return await razorpay.subscriptions.fetch(subscriptionId) as unknown as RazorpaySubscription;
  } catch (error) {
    log.error('Failed to fetch subscription', error);
    throw new Error('Failed to fetch subscription');
  }
}

// ============================================
// PAYMENT LINKS (for Fundraising Commission)
// ============================================

export interface CreatePaymentLinkParams {
  amount: number; // in paise
  description: string;
  customer: {
    name: string;
    email: string;
  };
  notes?: Record<string, string>;
  callbackUrl?: string;
}

export interface RazorpayPaymentLink {
  id: string;
  amount: number;
  currency: string;
  status: string;
  short_url: string;
}

/**
 * Create a Razorpay Payment Link for fundraising commissions.
 */
export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<RazorpayPaymentLink> {
  const razorpay = getRazorpay();

  const options = {
    amount: params.amount,
    currency: CURRENCY,
    description: params.description,
    customer: {
      name: params.customer.name,
      email: params.customer.email,
    },
    notify: {
      sms: false,
      email: true,
    },
    notes: params.notes || {},
    callback_url: params.callbackUrl || '',
    callback_method: 'get' as const,
  };

  log.info(`Creating payment link: ₹${params.amount / 100}`);

  try {
    const link = await (razorpay as any).paymentLink.create(options) as unknown as RazorpayPaymentLink;
    log.info(`Payment link created: ${link.id}`);
    return link;
  } catch (error) {
    log.error('Failed to create payment link', error);
    throw new Error('Failed to create payment link');
  }
}

// ============================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================

/**
 * Verify Razorpay webhook signature.
 * The raw request body (as string) is signed using RAZORPAY_WEBHOOK_SECRET.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    log.error('Cannot verify webhook: RAZORPAY_WEBHOOK_SECRET not set');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    log.error('Webhook signature verification error', error);
    return false;
  }
}

// ============================================
// FETCH PAYMENT DETAILS
// ============================================

/**
 * Fetch payment details from Razorpay.
 */
export async function fetchPayment(paymentId: string): Promise<Record<string, unknown>> {
  const razorpay = getRazorpay();

  try {
    return await razorpay.payments.fetch(paymentId) as unknown as Record<string, unknown>;
  } catch (error) {
    log.error('Failed to fetch payment', error);
    throw new Error('Failed to fetch payment details');
  }
}

/**
 * Get the public Razorpay key for frontend checkout.
 * This is safe to expose — it identifies your account, not authorizes it.
 */
export function getPublicKey(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || RAZORPAY_KEY_ID || '';
}
