/**
 * Payment System Constants
 * All amounts are in paise (1 INR = 100 paise)
 */

// ============================================
// PAYMENT AMOUNTS (in paise)
// ============================================

/** ₹499 one-time founder profile creation fee */
export const FOUNDER_PROFILE_FEE = 49900;

/** ₹1,999/month Startup Boost subscription */
export const STARTUP_BOOST_MONTHLY = 199900;

/** 5% commission on successful fundraising */
export const FUNDRAISING_COMMISSION_PERCENT = 5;

/** Default currency */
export const CURRENCY = 'INR';

// ============================================
// PAYMENT PURPOSES
// ============================================

export type PaymentPurpose =
  | 'founder_profile'
  | 'boost_subscription'
  | 'ai_report'
  | 'mentor_session'
  | 'fundraising_commission';

export const PAYMENT_PURPOSE_LABELS: Record<PaymentPurpose, string> = {
  founder_profile: 'Founder Profile Creation',
  boost_subscription: 'Startup Boost Subscription',
  ai_report: 'AI Market Validation Report',
  mentor_session: 'Mentor Session Booking',
  fundraising_commission: 'Fundraising Commission',
};

export const PAYMENT_PURPOSE_AMOUNTS: Partial<Record<PaymentPurpose, number>> = {
  founder_profile: FOUNDER_PROFILE_FEE,
  boost_subscription: STARTUP_BOOST_MONTHLY,
  // ai_report, mentor_session, fundraising_commission are variable
};

// ============================================
// RAZORPAY PLAN IDS
// Populate these after creating plans in Razorpay Dashboard
// ============================================

export const RAZORPAY_PLAN_IDS = {
  startup_boost_monthly: process.env.RAZORPAY_BOOST_PLAN_ID || 'plan_PLACEHOLDER',
} as const;

// ============================================
// MENTOR SESSION CONFIG
// ============================================

export const MENTOR_SESSION_DURATIONS = [30, 45, 60] as const;
export type MentorSessionDuration = (typeof MENTOR_SESSION_DURATIONS)[number];

export const MENTOR_MIN_FEE = 50000; // ₹500 minimum
export const MENTOR_MAX_FEE = 1000000; // ₹10,000 maximum

// ============================================
// SUBSCRIPTION GRACE PERIOD
// ============================================

/** Grace period in days after subscription cancellation */
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 3;

// ============================================
// HELPER: format amount from paise to INR display string
// ============================================

export function formatAmountINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}
