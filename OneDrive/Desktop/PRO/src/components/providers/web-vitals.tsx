'use client';

/**
 * Web Vitals Reporter
 * Tracks Core Web Vitals (LCP, FID, CLS, TTFB, INP) and reports them.
 * - Development: logs to console
 * - Production: sends to /api/health/vitals (optional)
 */

import { useEffect, useRef } from 'react';

interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP' | 'FCP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Thresholds from https://web.dev/articles/vitals
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  INP: [200, 500],
  FCP: [1800, 3000],
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const [good, poor] = THRESHOLDS[name] || [Infinity, Infinity];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function reportMetric(metric: WebVitalMetric) {
  const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `${emoji} [Web Vital] ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`
    );
  }

  // In production, send to analytics endpoint (fire-and-forget)
  if (process.env.NODE_ENV === 'production' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(
        '/api/health/vitals',
        JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          path: window.location.pathname,
          timestamp: Date.now(),
        })
      );
    } catch {
      // Silently fail — vitals reporting is non-critical
    }
  }
}

/**
 * Observes Core Web Vitals using PerformanceObserver API.
 * No external dependencies — uses native browser APIs.
 */
function observeWebVitals() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  // LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) {
        reportMetric({
          name: 'LCP',
          value: last.startTime,
          rating: getRating('LCP', last.startTime),
          delta: last.startTime,
          id: `lcp-${Date.now()}`,
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* unsupported */ }

  // FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = (entry as any).processingStart - entry.startTime;
        reportMetric({
          name: 'FID',
          value: fid,
          rating: getRating('FID', fid),
          delta: fid,
          id: `fid-${Date.now()}`,
        });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch { /* unsupported */ }

  // CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      reportMetric({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: `cls-${Date.now()}`,
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch { /* unsupported */ }

  // FCP (First Contentful Paint)
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          reportMetric({
            name: 'FCP',
            value: entry.startTime,
            rating: getRating('FCP', entry.startTime),
            delta: entry.startTime,
            id: `fcp-${Date.now()}`,
          });
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch { /* unsupported */ }

  // TTFB (Time to First Byte)
  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const ttfb = navEntries[0].responseStart;
      reportMetric({
        name: 'TTFB',
        value: ttfb,
        rating: getRating('TTFB', ttfb),
        delta: ttfb,
        id: `ttfb-${Date.now()}`,
      });
    }
  } catch { /* unsupported */ }
}

/**
 * Component that initializes Web Vitals tracking on mount.
 * Renders nothing. Place once in the root layout.
 */
export function WebVitalsReporter() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    observeWebVitals();
  }, []);

  return null;
}
