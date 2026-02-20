/**
 * Security Utility Functions
 * Provides middleware helpers, rate limiting, and security utilities
 * 
 * UPDATED: New Monetization Model
 * - Only Founders have subscription plans
 * - Talent and Investors have full access (free)
 * - Plan checks only apply to founders
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromCookies, TokenPayload } from './auth';
import { connectDB } from './mongodb';
import { Subscription, User, IUser, ISubscription } from './models';
import {
  getPlanFeatures,
  PlanType,
  hasFeature as checkHasFeature,
  FeatureKey,
  roleRequiresSubscription,
  FOUNDER_PLAN_FEATURES
} from './subscription/features';

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute (guard for Edge runtime)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export const RATE_LIMITS = {
  login: { windowMs: 60000, maxRequests: 5, message: 'Too many login attempts. Please try again later.' },
  register: { windowMs: 3600000, maxRequests: 3, message: 'Too many registration attempts. Please try again later.' },
  api: { windowMs: 60000, maxRequests: 100, message: 'Too many requests. Please slow down.' },
  search: { windowMs: 60000, maxRequests: 30, message: 'Too many search requests.' },
  message: { windowMs: 60000, maxRequests: 20, message: 'Too many messages sent.' },
  alliance: { windowMs: 3600000, maxRequests: 20, message: 'Too many alliance requests.' },
} as const;

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getRateLimitKey(request: NextRequest, suffix?: string): string {
  const ip = request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return `rate_limit:${ip}${suffix ? `:${suffix}` : ''}`;
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

export interface AuthResult {
  success: true;
  user: TokenPayload;
  subscription?: {
    plan: PlanType;
    status: string;
  };
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Require authentication - verifies JWT token from httpOnly cookies
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  const token = extractTokenFromCookies(request);

  if (!token) {
    return {
      success: false,
      error: 'Authentication required',
      status: 401,
    };
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return {
      success: false,
      error: 'Invalid or expired token',
      status: 401,
    };
  }

  // Get user's subscription (only matters for founders)
  try {
    await connectDB();
    const user = await User.findById(decoded.userId).lean() as IUser | null;
    const subscription = await Subscription.findOne({ userId: decoded.userId }).lean() as ISubscription | null;

    // Non-founders don't need subscription plans
    if (user && user.role !== 'founder') {
      return {
        success: true,
        user: decoded,
        subscription: {
          plan: 'free' as PlanType,
          status: 'active',
        },
      };
    }

    return {
      success: true,
      user: decoded,
      subscription: subscription ? {
        plan: subscription.plan as PlanType,
        status: subscription.status as string,
      } : {
        plan: 'free_founder' as PlanType,
        status: 'active',
      },
    };
  } catch {
    // Return auth success even if subscription lookup fails
    return {
      success: true,
      user: decoded,
      subscription: {
        plan: 'free_founder' as PlanType,
        status: 'active',
      },
    };
  }
}

/**
 * Require specific role
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      success: false,
      error: 'Insufficient permissions',
      status: 403,
    };
  }

  return authResult;
}

/**
 * Require admin role
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult | AuthError> {
  return requireRole(request, ['admin']);
}

/**
 * Require subscription plan feature
 * 
 * NEW BEHAVIOR: Only applies to founders
 * Non-founders (talent, investor, admin) bypass all plan checks
 */
export async function requirePlan(
  request: NextRequest,
  feature: FeatureKey
): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    return authResult;
  }

  // Non-founders bypass subscription checks - they have full access
  if (authResult.user.role !== 'founder') {
    return authResult;
  }

  // Only founders need plan checks
  const plan = authResult.subscription?.plan || 'free_founder';

  if (!checkHasFeature('founder', plan, feature)) {
    return {
      success: false,
      error: `This feature requires a higher subscription plan. Current plan: ${plan}`,
      status: 403,
    };
  }

  return authResult;
}

/**
 * Check if user has reached plan limit
 * 
 * NEW BEHAVIOR: Only applies to founders
 * Non-founders have no limits
 */
export async function checkPlanLimit(
  userId: string,
  limitType: 'maxProjects' | 'maxTeamMembers' | 'maxAlliances',
  currentCount: number
): Promise<{ allowed: boolean; limit: number; plan: PlanType }> {
  await connectDB();

  const user = await User.findById(userId).lean() as IUser | null;

  // Non-founders have no limits
  if (!user || user.role !== 'founder') {
    return { allowed: true, limit: -1, plan: 'free' as PlanType };
  }

  const subscription = await Subscription.findOne({ userId }).lean() as ISubscription | null;
  const plan = (subscription?.plan as PlanType) || 'free_founder';
  const features = getPlanFeatures(plan);
  const limit = features[limitType];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, plan };
  }

  return {
    allowed: currentCount < limit,
    limit,
    plan,
  };
}

// ============================================
// RESPONSE HELPERS
// ============================================

export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

export function forbiddenResponse(message: string = 'Insufficient permissions'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

export function rateLimitResponse(resetTime: number, message: string = 'Too many requests'): NextResponse {
  return NextResponse.json(
    { error: message, retryAfter: Math.ceil((resetTime - Date.now()) / 1000) },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
      },
    }
  );
}

export function validationErrorResponse(errors: string[]): NextResponse {
  return NextResponse.json(
    { error: 'Validation failed', details: errors },
    { status: 400 }
  );
}

// ============================================
// REQUEST HELPERS
// ============================================

/**
 * Get client IP address
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Get user agent
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Check if request is from authenticated user
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const result = await requireAuth(request);
  return result.success;
}

/**
 * Get current user ID from request
 */
export async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const result = await requireAuth(request);
  return result.success ? result.user.userId : null;
}

/**
 * Escape regex special characters to prevent ReDoS
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize search query for MongoDB
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  // Limit length and escape regex
  return escapeRegex(query.trim().substring(0, 100));
}
