/**
 * API Performance Middleware
 * Wraps route handlers with timing, slow-query detection, and cache headers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from './logger';

const log = createLogger('api-perf');

/** Threshold (ms) above which an API response is considered slow */
const SLOW_API_THRESHOLD = 500;

// ============================================
// CACHE HEADER PRESETS
// ============================================

export const CACHE_HEADERS = {
  /** Private, short TTL — authenticated dashboard data */
  DASHBOARD: {
    'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
  },
  /** Public, medium TTL — startup listings */
  PUBLIC_LIST: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  },
  /** Public, long TTL — static reference data */
  STATIC: {
    'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
  },
  /** No cache — mutations, auth, etc. */
  NO_CACHE: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
} as const;

// ============================================
// PERFORMANCE WRAPPER
// ============================================

type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

interface PerformanceOptions {
  /** Cache header preset to apply to successful responses */
  cachePreset?: keyof typeof CACHE_HEADERS;
  /** Custom slow threshold in ms (default: 500) */
  slowThreshold?: number;
  /** Route label for logging (e.g. 'GET /api/startups') */
  label?: string;
}

/**
 * Wraps an API route handler with:
 * - Response timing (X-Response-Time header)
 * - Slow API detection and logging
 * - Cache-Control header injection
 * - Error recovery with structured logging
 */
export function withPerformance(
  handler: RouteHandler,
  options: PerformanceOptions = {}
): RouteHandler {
  const threshold = options.slowThreshold ?? SLOW_API_THRESHOLD;

  return async (request: NextRequest, context?: any) => {
    const start = Date.now();
    const method = request.method;
    const path = request.nextUrl.pathname;
    const label = options.label ?? `${method} ${path}`;

    try {
      const response = await handler(request, context);
      const duration = Date.now() - start;

      // Add timing header
      response.headers.set('X-Response-Time', `${duration}ms`);

      // Add cache headers for successful responses
      if (response.status < 400 && options.cachePreset) {
        const headers = CACHE_HEADERS[options.cachePreset];
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      }

      // Log slow responses
      if (duration > threshold) {
        log.warn(`Slow API response: ${label} took ${duration}ms (threshold: ${threshold}ms)`, {
          method,
          path,
          duration,
          status: response.status,
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      log.error(`API error: ${label} failed after ${duration}ms`, error, {
        method,
        path,
        duration,
      });
      throw error;
    }
  };
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create a JSON response with standard performance headers.
 */
export function perfResponse<T>(
  data: T,
  options: {
    status?: number;
    cachePreset?: keyof typeof CACHE_HEADERS;
    startTime?: number;
  } = {}
): NextResponse {
  const response = NextResponse.json(data, { status: options.status ?? 200 });

  if (options.startTime) {
    response.headers.set('X-Response-Time', `${Date.now() - options.startTime}ms`);
  }

  if (options.cachePreset) {
    const headers = CACHE_HEADERS[options.cachePreset];
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
  }

  return response;
}
