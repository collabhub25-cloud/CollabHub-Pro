/**
 * Production Security Middleware
 * Global auth enforcement, security headers, CORS, rate limiting, CSRF protection, and role-based page guards
 * 
 * Security Features:
 * - JWT-based authentication via httpOnly cookies
 * - CSRF protection (Double Submit Cookie pattern)
 * - Rate limiting with IP-based tracking
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Request ID tracking for debugging
 * - Role-based access control (RBAC)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = process.env.JWT_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// CRITICAL: Fail fast if JWT_SECRET is not set in production
if (IS_PRODUCTION && !JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set in production!');
}

// Use a default only in development
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'AlloySphere-dev-secret-change-in-production';

// CSRF Configuration
const CSRF_COOKIE_NAME = '_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_MAX_AGE = 24 * 60 * 60; // 24 hours

/** Routes that do NOT require authentication */
const PUBLIC_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/health',
  '/api/csrf-token',
]);

/** Route prefixes that are public */
const PUBLIC_PREFIXES = [
  '/api/webhooks/',
];

/** Route prefixes that require admin role */
const ADMIN_ROUTES = [
  '/api/admin/',
];

/** Routes exempt from CSRF protection */
const CSRF_EXEMPT_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/health',
  '/api/csrf-token',
  '/api/auth/me',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]);

/** Methods that require CSRF protection */
const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Public page routes (no auth needed) */
const PUBLIC_PAGES = new Set([
  '/',
  '/login',
  '/founders',
  '/investors',
  '/talent',
  '/signup/founder',
  '/signup/investor',
  '/signup/talent',
  '/forgot-password',
]);

/** Dashboard role mapping */
const DASHBOARD_ROLE_MAP: Record<string, string> = {
  '/dashboard/founder': 'founder',
  '/dashboard/investor': 'investor',
  '/dashboard/talent': 'talent',
};

// ============================================
// SECURITY HEADERS
// ============================================

const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.cloudfront.net; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://generativelanguage.googleapis.com https://livelog.razorpay.com; frame-src 'self' https://accounts.google.com https://api.razorpay.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';",
  'X-Request-Id': '', // Will be set dynamically
};

if (IS_PRODUCTION) {
  SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
}

// ============================================
// CSRF HELPERS
// ============================================

function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JS to send in header
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_TOKEN_MAX_AGE,
  });
}

function validateCsrfToken(request: NextRequest): { valid: boolean; error?: string } {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken) {
    return { valid: false, error: 'CSRF cookie missing' };
  }

  if (!headerToken) {
    return { valid: false, error: 'CSRF header missing' };
  }

  try {
    const cookieBuffer = Buffer.from(cookieToken, 'hex');
    const headerBuffer = Buffer.from(headerToken, 'hex');

    if (cookieBuffer.length !== headerBuffer.length) {
      return { valid: false, error: 'CSRF token length mismatch' };
    }

    if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
      return { valid: false, error: 'CSRF token mismatch' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid CSRF token format' };
  }
}

function requiresCsrfProtection(method: string, pathname: string): boolean {
  if (!CSRF_PROTECTED_METHODS.has(method)) {
    return false;
  }

  if (CSRF_EXEMPT_ROUTES.has(pathname)) {
    return false;
  }

  if (pathname.startsWith('/api/webhooks/')) {
    return false;
  }

  return true;
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============================================
// RATE LIMITING (LRU-bounded in-memory)
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const MAX_ENTRIES = 10000;
const rateLimitStore = new Map<string, RateLimitEntry>();

function evictOldEntries(): void {
  if (rateLimitStore.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }
  if (rateLimitStore.size > MAX_ENTRIES) {
    const keysToDelete = Array.from(rateLimitStore.keys()).slice(0, rateLimitStore.size - MAX_ENTRIES);
    keysToDelete.forEach(k => rateLimitStore.delete(k));
  }
}

const RATE_LIMITS_TIERS: Record<string, { windowMs: number; maxRequests: number }> = {
  auth: { windowMs: 60000, maxRequests: 10 },
  ai: { windowMs: 60000, maxRequests: 5 },
  mutation: { windowMs: 60000, maxRequests: 30 },
  default: { windowMs: 60000, maxRequests: 100 },
};

function getRateLimitTier(pathname: string, method: string): string {
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) return 'auth';
  if (pathname.startsWith('/api/ai/')) return 'ai';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'mutation';
  return 'default';
}

function checkRateLimit(ip: string, pathname: string, method: string): boolean {
  const tier = getRateLimitTier(pathname, method);
  const { windowMs, maxRequests } = RATE_LIMITS_TIERS[tier];
  const key = `${ip}:${tier}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    evictOldEntries();
    return true;
  }

  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// ============================================
// HELPERS
// ============================================

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.has(pathname);
}

function getDashboardRole(pathname: string): string | null {
  for (const [prefix, role] of Object.entries(DASHBOARD_ROLE_MAP)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return role;
    }
  }
  return null;
}

// ============================================
// MAIN MIDDLEWARE
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Generate request ID for tracing
  const requestId = generateRequestId();

  // --- Security headers on all responses ---
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (key !== 'X-Request-Id') {
      response.headers.set(key, value);
    }
  }
  response.headers.set('X-Request-Id', requestId);

  // --- Ensure CSRF token cookie exists for browser clients ---
  if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    const csrfToken = generateCsrfToken();
    setCsrfCookie(response, csrfToken);
  }

  // --- Static / public pages pass through ---
  if (!isApiRoute(pathname) && !pathname.startsWith('/dashboard')) {
    return response;
  }

  // --- Dashboard Page Guards ---
  if (pathname.startsWith('/dashboard')) {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const decoded = jwt.verify(accessToken, EFFECTIVE_JWT_SECRET) as { userId: string; email: string; role: string };
      const requiredRole = getDashboardRole(pathname);

      if (requiredRole && decoded.role !== requiredRole) {
        // Redirect to their correct dashboard
        return NextResponse.redirect(new URL(`/dashboard/${decoded.role}`, request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  }

  // --- Rate limiting on all API routes ---
  const ip = getClientIp(request);
  if (!checkRateLimit(ip, pathname, method)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', requestId },
      {
        status: 429,
        headers: { 'Retry-After': '60', 'X-Request-Id': requestId, ...SECURITY_HEADERS },
      }
    );
  }

  // --- CSRF Protection ---
  if (requiresCsrfProtection(method, pathname)) {
    const csrfValidation = validateCsrfToken(request);
    if (!csrfValidation.valid) {
      return NextResponse.json(
        { error: 'CSRF validation failed', details: IS_PRODUCTION ? undefined : csrfValidation.error, requestId },
        { status: 403, headers: { 'X-Request-Id': requestId, ...SECURITY_HEADERS } }
      );
    }
  }

  // --- Public routes skip auth ---
  if (isPublicRoute(pathname)) {
    return response;
  }

  // --- GET /api/startups is public (browse without login) ---
  if (pathname === '/api/startups' && method === 'GET') {
    return response;
  }

  // ============================================
  // AUTH ENFORCEMENT — cookie-based JWT with auto-refresh
  // ============================================
  let accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // Try to verify the access token
  let decoded: { userId: string; email: string; role: string } | null = null;
  let needsTokenRefresh = false;

  if (accessToken) {
    try {
      decoded = jwt.verify(accessToken, EFFECTIVE_JWT_SECRET) as unknown as typeof decoded;
    } catch {
      // Access token invalid/expired — try refresh
      decoded = null;
      needsTokenRefresh = true;
    }
  } else {
    needsTokenRefresh = true;
  }

  // If access token is missing or expired, try to refresh using refresh token
  if (!decoded && refreshToken) {
    try {
      const EFFECTIVE_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET) || EFFECTIVE_JWT_SECRET + '-refresh';
      const refreshDecoded = jwt.verify(refreshToken, EFFECTIVE_REFRESH_SECRET) as { userId: string; email: string; role: string };

      // Generate a new access token
      decoded = {
        userId: refreshDecoded.userId,
        email: refreshDecoded.email,
        role: refreshDecoded.role,
      };

      accessToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email, role: decoded.role },
        EFFECTIVE_JWT_SECRET,
        { expiresIn: '15m' }
      );

      needsTokenRefresh = true;
    } catch {
      // Refresh token also invalid — user must re-login
      decoded = null;
    }
  }

  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required', requestId },
      { status: 401, headers: { 'X-Request-Id': requestId, ...SECURITY_HEADERS } }
    );
  }

  // --- RBAC: Admin route protection ---
  if (isAdminRoute(pathname) && decoded.role !== 'admin') {
    return NextResponse.json(
      { error: 'Insufficient permissions', requestId },
      { status: 403, headers: { 'X-Request-Id': requestId, ...SECURITY_HEADERS } }
    );
  }

  // --- Inject user context into request headers for downstream route handlers ---
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', decoded.userId);
  requestHeaders.set('x-user-email', decoded.email);
  requestHeaders.set('x-user-role', decoded.role);
  requestHeaders.set('x-request-id', requestId);

  const nextResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // If we refreshed the token, set the new access token cookie on the response
  if (needsTokenRefresh && accessToken) {
    nextResponse.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
  }

  return nextResponse;
}

// ============================================
// MATCHER — which routes this middleware runs on
// ============================================

export const runtime = 'nodejs';

export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Apply to dashboard routes for role guards
    '/dashboard/:path*',
    // Apply security headers to all pages too
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
