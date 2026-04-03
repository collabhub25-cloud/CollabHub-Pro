/**
 * Production Security Configuration
 * Centralized security settings and constants
 */

// ============================================
// ENVIRONMENT
// ============================================

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// ============================================
// AUTHENTICATION
// ============================================

export const AUTH_CONFIG = {
  // Token expiration times
  ACCESS_TOKEN_EXPIRES: '15m',
  REFRESH_TOKEN_EXPIRES: '7d',
  
  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_SALT_ROUNDS: 12,
  
  // Session settings
  SESSION_COOKIE_NAME: 'accessToken',
  REFRESH_COOKIE_NAME: 'refreshToken',
  
  // Cookie settings
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax' as const,
    path: '/',
  },
} as const;

// ============================================
// RATE LIMITING
// ============================================

export const RATE_LIMIT_CONFIG = {
  // Global API rate limit
  GLOBAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  
  // Authentication endpoints
  LOGIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
  PASSWORD_RESET: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3,
  },
  
  // Sensitive operations
  PAYMENT: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
  KYC: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
} as const;

// ============================================
// ACCOUNT LOCKOUT
// ============================================

export const LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  PROGRESSIVE_MULTIPLIER: 2, // Double lockout time for each subsequent lock
} as const;

// ============================================
// CSRF PROTECTION
// ============================================

export const CSRF_CONFIG = {
  COOKIE_NAME: '_csrf_token',
  HEADER_NAME: 'x-csrf-token',
  TOKEN_LENGTH: 32,
  TOKEN_MAX_AGE: 24 * 60 * 60, // 24 hours in seconds
} as const;

// ============================================
// SECURITY HEADERS
// ============================================

export const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  ...(IS_PRODUCTION && {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  }),
} as const;

// ============================================
// CONTENT SECURITY POLICY
// ============================================

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    'https://accounts.google.com',
    'https://checkout.razorpay.com',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://lh3.googleusercontent.com',
    'https://avatars.githubusercontent.com',
    'https://*.cloudfront.net',
  ],
  'connect-src': [
    "'self'",
    'https://accounts.google.com',
    'https://oauth2.googleapis.com',
    'https://www.googleapis.com',
    'https://api.openai.com',
    'https://generativelanguage.googleapis.com',
    'https://livelog.razorpay.com',
  ],
  'frame-src': ["'self'", 'https://accounts.google.com', 'https://api.razorpay.com'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
} as const;

export function buildCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// ============================================
// INPUT VALIDATION
// ============================================

export const INPUT_LIMITS = {
  // Field length limits
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  PASSWORD_MAX: 128,
  BIO_MAX: 1000,
  DESCRIPTION_MAX: 2000,
  MESSAGE_MAX: 5000,
  URL_MAX: 500,
  
  // Collection limits
  MAX_SKILLS: 20,
  MAX_ROLES: 10,
  MAX_ATTACHMENTS: 10,
  
  // File size limits
  MAX_BODY_SIZE: 1024 * 1024, // 1MB
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

// ============================================
// SENSITIVE FIELDS (for logging redaction)
// ============================================

export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
  'otp',
  'verificationOtpHash',
  'resetPasswordOtpHash',
] as const;

// ============================================
// ALLOWED ORIGINS (CORS)
// ============================================

export const ALLOWED_ORIGINS = IS_PRODUCTION
  ? [
      'https://collabhub.app',
      'https://www.collabhub.app',
    ]
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

// ============================================
// TRUSTED PROXIES
// ============================================

export const TRUSTED_PROXY_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip', // Cloudflare
  'x-vercel-forwarded-for', // Vercel
] as const;
