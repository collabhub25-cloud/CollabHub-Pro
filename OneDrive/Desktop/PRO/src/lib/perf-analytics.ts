/**
 * Server-side Performance Analytics
 * Lightweight in-memory tracking for API response times and cache metrics.
 * No external dependencies — uses a ring buffer for O(1) memory.
 */

import { createLogger } from './logger';

const log = createLogger('perf-analytics');

// ============================================
// RING BUFFER FOR RESPONSE TIMES
// ============================================

class RingBuffer {
  private buffer: number[];
  private index = 0;
  private full = false;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity).fill(0);
  }

  push(value: number): void {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.capacity;
    if (this.index === 0) this.full = true;
  }

  getAll(): number[] {
    if (!this.full) return this.buffer.slice(0, this.index);
    return [...this.buffer.slice(this.index), ...this.buffer.slice(0, this.index)];
  }

  get size(): number {
    return this.full ? this.capacity : this.index;
  }
}

// ============================================
// PERFORMANCE TRACKER
// ============================================

interface RouteMetrics {
  times: RingBuffer;
  totalRequests: number;
  slowRequests: number;
  errors: number;
}

class PerformanceTracker {
  private routes = new Map<string, RouteMetrics>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private bufferSize: number;
  private slowThreshold: number;

  constructor(bufferSize = 100, slowThreshold = 500) {
    this.bufferSize = bufferSize;
    this.slowThreshold = slowThreshold;
  }

  /**
   * Record an API response time for a route.
   */
  recordResponse(route: string, durationMs: number, isError = false): void {
    let metrics = this.routes.get(route);
    if (!metrics) {
      metrics = {
        times: new RingBuffer(this.bufferSize),
        totalRequests: 0,
        slowRequests: 0,
        errors: 0,
      };
      this.routes.set(route, metrics);
    }

    metrics.times.push(durationMs);
    metrics.totalRequests++;
    if (durationMs > this.slowThreshold) metrics.slowRequests++;
    if (isError) metrics.errors++;
  }

  /**
   * Record a cache hit or miss.
   */
  recordCacheAccess(hit: boolean): void {
    if (hit) this.cacheHits++;
    else this.cacheMisses++;
  }

  /**
   * Get percentile value from sorted array.
   */
  private percentile(sorted: number[], pct: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((pct / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  /**
   * Get performance summary for a route.
   */
  getRouteStats(route: string) {
    const metrics = this.routes.get(route);
    if (!metrics || metrics.times.size === 0) return null;

    const values = metrics.times.getAll().sort((a, b) => a - b);

    return {
      route,
      totalRequests: metrics.totalRequests,
      slowRequests: metrics.slowRequests,
      errors: metrics.errors,
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: values[0],
      max: values[values.length - 1],
    };
  }

  /**
   * Get overall cache statistics.
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total,
      hitRate: total > 0 ? ((this.cacheHits / total) * 100).toFixed(1) + '%' : '0.0%',
    };
  }

  /**
   * Get summary for all tracked routes.
   */
  getSummary() {
    const routes: Record<string, ReturnType<typeof this.getRouteStats>> = {};
    for (const route of this.routes.keys()) {
      routes[route] = this.getRouteStats(route);
    }
    return {
      routes,
      cache: this.getCacheStats(),
      trackedRoutes: this.routes.size,
    };
  }

  /**
   * Log the current performance summary.
   */
  logSummary(): void {
    const summary = this.getSummary();
    log.info('Performance summary', {
      cache: summary.cache,
      trackedRoutes: summary.trackedRoutes,
    });

    for (const [route, stats] of Object.entries(summary.routes)) {
      if (stats && stats.p95 > this.slowThreshold) {
        log.warn(`Slow route detected: ${route}`, {
          p50: stats.p50,
          p95: stats.p95,
          p99: stats.p99,
          slowRequests: stats.slowRequests,
        });
      }
    }
  }
}

// ============================================
// SINGLETON
// ============================================

export const perfTracker = new PerformanceTracker();

// Log summary every 5 minutes in production
if (process.env.NODE_ENV === 'production' && typeof setInterval !== 'undefined') {
  setInterval(() => {
    perfTracker.logSummary();
  }, 5 * 60 * 1000);
}
