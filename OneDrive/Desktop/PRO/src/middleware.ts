/**
 * Production Security Middleware
 * Global auth enforcement, security headers, CORS, and rate limiting
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'collabhub-dev-secret-change-in-production';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** Routes that do NOT require authentication */
const PUBLIC_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
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

// ============================================
// SECURITY HEADERS
// ============================================

const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
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

  // --- Static / non-API routes pass through ---
  if (!isApiRoute(pathname)) {
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
    // Apply security headers to all pages too
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
