/**
 * Production Security Middleware
 * Global auth enforcement, security headers, CORS, rate limiting, and role-based page guards
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'AlloySphere-dev-secret-change-in-production';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
  '/api/health',
]);

/** Route prefixes that are public */
const PUBLIC_PREFIXES = [
  '/api/webhooks/',
];

/** Route prefixes that require admin role */
const ADMIN_ROUTES = [
  '/api/admin/',
];

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
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://livelog.razorpay.com; frame-src 'self' https://accounts.google.com https://api.razorpay.com;",
};

if (IS_PRODUCTION) {
  SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
}

// ============================================
// RATE LIMITING (in-memory; Phase 5 upgrades to Redis)
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60s
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

function checkRateLimit(ip: string, windowMs = 60000, maxRequests = 100): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

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

  // --- Security headers on all responses ---
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
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
      const decoded = jwt.verify(accessToken, JWT_SECRET) as { userId: string; email: string; role: string };
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
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: { 'Retry-After': '60', ...SECURITY_HEADERS },
      }
    );
  }

  // --- Public routes skip auth ---
  if (isPublicRoute(pathname)) {
    return response;
  }

  // --- GET /api/startups is public (browse without login) ---
  if (pathname === '/api/startups' && request.method === 'GET') {
    return response;
  }

  // ============================================
  // AUTH ENFORCEMENT — cookie-based JWT
  // ============================================
  const accessToken = request.cookies.get('accessToken')?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: SECURITY_HEADERS }
    );
  }

  // Verify access token
  let decoded: { userId: string; email: string; role: string };
  try {
    decoded = jwt.verify(accessToken, JWT_SECRET) as typeof decoded;
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401, headers: SECURITY_HEADERS }
    );
  }

  // --- RBAC: Admin route protection ---
  if (isAdminRoute(pathname) && decoded.role !== 'admin') {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403, headers: SECURITY_HEADERS }
    );
  }

  // --- Inject user context into request headers for downstream route handlers ---
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', decoded.userId);
  requestHeaders.set('x-user-email', decoded.email);
  requestHeaders.set('x-user-role', decoded.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
