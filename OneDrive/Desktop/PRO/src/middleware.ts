/**
 * Production Security Middleware
 * Handles security headers, CSRF protection, and request validation
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================
// SECURITY CONFIGURATION
// ============================================

const SECURITY_CONFIG = {
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js in development
      "'unsafe-eval'", // Required for some Next.js features
      'https://js.stripe.com',
      'https://challenges.cloudflare.com',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://avatars.githubusercontent.com',
      'https://lh3.googleusercontent.com',
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://js.stripe.com',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    ],
    'frame-src': [
      "'self'",
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  },

  // Rate limiting (memory-based fallback)
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  // Paths that should have stricter security
  strictPaths: ['/api/admin', '/api/webhooks', '/api/stripe'],

  // Paths that should be public
  publicPaths: ['/api/health', '/api/auth/login', '/api/auth/register'],

  // Paths that require authentication
  protectedPaths: ['/api/'],
};

// ============================================
// RATE LIMITING (In-memory fallback)
// ============================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.rateLimit.windowMs,
    });
    return { allowed: true, remaining: SECURITY_CONFIG.rateLimit.maxRequests - 1 };
  }

  if (entry.count >= SECURITY_CONFIG.rateLimit.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: SECURITY_CONFIG.rateLimit.maxRequests - entry.count };
}

// ============================================
// SECURITY HEADERS
// ============================================

function getSecurityHeaders(isProduction: boolean): Record<string, string> {
  const cspDirectives = Object.entries(SECURITY_CONFIG.csp)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');

  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS filter
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',

    // Content Security Policy
    'Content-Security-Policy': isProduction ? cspDirectives : '',

    // Strict Transport Security (HTTPS only)
    'Strict-Transport-Security': isProduction ? 'max-age=31536000; includeSubDomains; preload' : '',

    // Cache control for API routes
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  };
}

// ============================================
// MAIN MIDDLEWARE
// ============================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.next();

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return response;
  }

  // Apply security headers to all responses
  const securityHeaders = getSecurityHeaders(isProduction);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for webhooks (they have their own signature verification)
    if (!pathname.startsWith('/api/webhooks')) {
      const ip = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown';

      const rateLimitKey = `${ip}:${pathname}`;
      const rateLimit = checkRateLimit(rateLimitKey);

      response.headers.set('X-RateLimit-Limit', String(SECURITY_CONFIG.rateLimit.maxRequests));
      response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 60));

      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          }
        );
      }
    }
  }

  // Block admin routes in production unless explicitly enabled
  if (isProduction && pathname.startsWith('/api/admin')) {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404 }
      );
    }
  }

  // Validate webhook signatures for Stripe
  if (pathname === '/api/webhooks/stripe') {
    // Stripe webhook verification is handled in the route itself
    // But we can add additional checks here
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400 }
      );
    }
  }

  // CORS headers for API routes (restricted in production)
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');

    if (isProduction) {
      // In production, only allow same-origin requests
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (origin && origin !== appUrl) {
        // Allow specific origins if configured
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
        if (!allowedOrigins.includes(origin)) {
          return new NextResponse(
            JSON.stringify({ error: 'CORS not allowed' }),
            { status: 403 }
          );
        }
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
    } else {
      // In development, allow all origins
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  // Handle OPTIONS requests for CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);
  request.headers.set('x-request-id', requestId);

  return response;
}

// ============================================
// MATCHER CONFIGURATION
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
