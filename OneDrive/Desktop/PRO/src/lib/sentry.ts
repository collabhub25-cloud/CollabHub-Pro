/**
 * Sentry Error Monitoring Integration
 * Production-ready error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

// ============================================
// SENTRY INITIALIZATION
// ============================================

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_RELEASE = process.env.npm_package_version || '1.0.0';

// Only initialize Sentry if DSN is configured
export function initializeSentry() {
  if (!SENTRY_DSN) {
    console.log('⚠️ Sentry DSN not configured, error monitoring disabled');
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: `collabhub@${SENTRY_RELEASE}`,

    // Performance monitoring
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session replay (optional, only for production)
    replaysSessionSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: SENTRY_ENVIRONMENT === 'production' ? 1.0 : 0,

    // Configure which errors to ignore
    ignoreErrors: [
      // Browser extensions
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'NetworkError',
      // Auth errors that are expected
      'Invalid token',
      'Token expired',
      'Unauthorized',
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-api-key'];
      }

      // Remove PII from request body
      if (event.request?.data && typeof event.request.data === 'string') {
        try {
          const data = JSON.parse(event.request.data);
          if (data.password) data.password = '[REDACTED]';
          if (data.passwordHash) data.passwordHash = '[REDACTED]';
          if (data.token) data.token = '[REDACTED]';
          event.request.data = JSON.stringify(data);
        } catch {
          // Not JSON, leave as is
        }
      }

      return event;
    },

    // Set user context
    initialScope: {
      tags: {
        component: 'server',
        version: SENTRY_RELEASE,
      },
    },
  });

  console.log('✅ Sentry initialized');
  return true;
}

// ============================================
// ERROR CAPTURE HELPERS
// ============================================

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  requestId?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

/**
 * Capture an exception with context
 */
export function captureError(error: Error | unknown, context?: ErrorContext): string {
  if (!SENTRY_DSN) {
    console.error('Error:', error, context);
    return '';
  }

  return Sentry.captureException(error, {
    user: context?.userId ? {
      id: context.userId,
      email: context.userEmail,
      username: context.userRole,
    } : undefined,
    tags: {
      requestId: context?.requestId,
      path: context?.path,
      method: context?.method,
    },
    extra: context,
  });
}

/**
 * Capture a message with context
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
): string {
  if (!SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
    return '';
  }

  return Sentry.captureMessage(message, {
    level,
    user: context?.userId ? {
      id: context.userId,
      email: context.userEmail,
    } : undefined,
    extra: context,
  });
}

/**
 * Set user context for subsequent errors
 */
export function setUserContext(user: { id: string; email?: string; role?: string } | null) {
  if (!SENTRY_DSN) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for error tracing
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  if (!SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(_name: string, _op: string) {
  // Note: Sentry.startTransaction was removed in newer SDK versions.
  // Use Sentry.startSpan() for performance tracing in the future.
  return {
    finish: () => { },
    setStatus: () => { },
    setData: () => { },
  };
}

// ============================================
// API ERROR HANDLER
// ============================================

import { NextRequest, NextResponse } from 'next/server';

export function withErrorTracking<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

    try {
      const response = await handler(request);
      return response;
    } catch (error) {
      // Capture the error with context
      captureError(error, {
        requestId,
        path: request.nextUrl.pathname,
        method: request.method,
      });

      // Return a proper error response
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';

      return NextResponse.json(
        {
          error: 'Internal server error',
          requestId,
          ...(process.env.NODE_ENV !== 'production' && { details: errorMessage })
        },
        { status: 500 }
      );
    }
  };
}

// ============================================
// UNHANDLED ERROR HANDLERS
// ============================================

export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    captureError(reason instanceof Error ? reason : new Error(String(reason)), {
      type: 'unhandledRejection',
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    captureError(error, {
      type: 'uncaughtException',
    });
  });
}

// Initialize on import if DSN is available
if (typeof window === 'undefined' && SENTRY_DSN) {
  initializeSentry();
  setupGlobalErrorHandlers();
}
