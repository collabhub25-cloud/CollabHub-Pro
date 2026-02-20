import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { cache } from '@/lib/cache';

// ============================================
// HEALTH CHECK ENDPOINT - PRODUCTION READY
// ============================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    cache: {
      status: 'up' | 'down';
      type: 'memory' | 'redis';
    };
    stripe: {
      status: 'configured' | 'not_configured';
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const isProduction = process.env.NODE_ENV === 'production';

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    environment: isProduction ? 'production' : 'development',
    checks: {
      database: { status: 'down' },
      cache: { status: 'down', type: 'memory' },
      stripe: { status: 'not_configured' },
    },
  };

  // Check database - don't expose connection details in production
  try {
    const dbStart = Date.now();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.admin().ping();
      health.checks.database = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    } else {
      health.checks.database = {
        status: 'down',
        error: isProduction ? 'Connection not ready' : 'Database connection not ready',
      };
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.checks.database = {
      status: 'down',
      error: isProduction ? 'Connection failed' : (error instanceof Error ? error.message : 'Unknown error'),
    };
    health.status = 'unhealthy';
  }

  // Check cache - minimal info in production
  try {
    await cache.set('health-check', 'test', 10);
    const value = await cache.get<string>('health-check');
    if (value === 'test') {
      health.checks.cache = {
        status: 'up',
        type: process.env.REDIS_URL ? 'redis' : 'memory',
      };
    } else {
      health.checks.cache = { status: 'down', type: 'memory' };
      health.status = 'degraded';
    }
    await cache.delete('health-check');
  } catch {
    health.checks.cache = { status: 'down', type: 'memory' };
    health.status = 'degraded';
  }

  // Check Stripe - don't expose key status
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  health.checks.stripe = {
    status: stripeKey ? 'configured' : 'not_configured',
  };

  // Calculate response time
  const responseTime = Date.now() - startTime;

  // Build response
  const response = NextResponse.json(health, {
    status: health.status === 'unhealthy' ? 503 : 200,
  });

  // Add timing headers
  response.headers.set('X-Response-Time', `${responseTime}ms`);
  response.headers.set('X-Health-Status', health.status);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return response;
}
