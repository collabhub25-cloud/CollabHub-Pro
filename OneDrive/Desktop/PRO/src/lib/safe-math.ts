/**
 * Safe Math Utilities
 * Prevents NaN, Infinity, and other numerical edge cases in metrics
 */

// ============================================
// BASIC SAFE OPERATIONS
// ============================================

/**
 * Safely parse a number with fallback
 */
export function safeParseNumber(value: unknown, fallback?: number): number;
export function safeParseNumber(value: unknown, fallback: undefined): number | undefined;
export function safeParseNumber(value: unknown, fallback: number | undefined = 0): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

/**
 * Safely add two numbers
 */
export function safeAdd(a: unknown, b: unknown, fallback = 0): number {
  const numA = safeParseNumber(a);
  const numB = safeParseNumber(b);
  const result = numA + numB;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Safely subtract two numbers
 */
export function safeSubtract(a: unknown, b: unknown, fallback = 0): number {
  const numA = safeParseNumber(a);
  const numB = safeParseNumber(b);
  const result = numA - numB;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Safely multiply two numbers
 */
export function safeMultiply(a: unknown, b: unknown, fallback = 0): number {
  const numA = safeParseNumber(a);
  const numB = safeParseNumber(b);
  const result = numA * numB;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Safely divide two numbers
 */
export function safeDivide(a: unknown, b: unknown, fallback = 0): number {
  const numA = safeParseNumber(a);
  const numB = safeParseNumber(b);

  if (numB === 0) {
    return fallback;
  }

  const result = numA / numB;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Safely calculate percentage
 */
export function safePercentage(part: unknown, total: unknown, fallback = 0): number {
  const numPart = safeParseNumber(part);
  const numTotal = safeParseNumber(total);

  if (numTotal === 0) {
    return fallback;
  }

  const result = (numPart / numTotal) * 100;
  return Number.isFinite(result) ? Math.round(result * 100) / 100 : fallback;
}

/**
 * Safely calculate average
 */
export function safeAverage(values: unknown[], fallback = 0): number {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  const validNumbers = values
    .map(v => safeParseNumber(v, undefined))
    .filter((v): v is number => v !== undefined && Number.isFinite(v));

  if (validNumbers.length === 0) {
    return fallback;
  }

  const sum = validNumbers.reduce((acc, val) => acc + val, 0);
  const result = sum / validNumbers.length;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Safely get sum of array
 */
export function safeSum(values: unknown[], fallback = 0): number {
  if (!Array.isArray(values)) {
    return fallback;
  }

  const validNumbers = values
    .map(v => safeParseNumber(v, undefined))
    .filter((v): v is number => v !== undefined && Number.isFinite(v));

  if (validNumbers.length === 0) {
    return fallback;
  }

  const result = validNumbers.reduce((acc, val) => acc + val, 0);
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Safely get count of array
 */
export function safeCount(values: unknown[]): number {
  if (!Array.isArray(values)) {
    return 0;
  }
  return values.length;
}

/**
 * Safely get min of array
 */
export function safeMin(values: unknown[], fallback = 0): number {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  const validNumbers = values
    .map(v => safeParseNumber(v, undefined))
    .filter((v): v is number => v !== undefined && Number.isFinite(v));

  if (validNumbers.length === 0) {
    return fallback;
  }

  const result = Math.min(...validNumbers);
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Safely get max of array
 */
export function safeMax(values: unknown[], fallback = 0): number {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  const validNumbers = values
    .map(v => safeParseNumber(v, undefined))
    .filter((v): v is number => v !== undefined && Number.isFinite(v));

  if (validNumbers.length === 0) {
    return fallback;
  }

  const result = Math.max(...validNumbers);
  return Number.isFinite(result) ? result : fallback;
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format currency with safe handling
 */
export function formatCurrency(value: unknown, currency = 'USD'): string {
  const num = safeParseNumber(value, 0);

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `$${num.toLocaleString()}`;
  }
}

/**
 * Format number with commas
 */
export function formatNumber(value: unknown): string {
  const num = safeParseNumber(value, 0);
  return num.toLocaleString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: unknown, decimals = 1): string {
  const num = safeParseNumber(value, 0);
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format large numbers (K, M, B)
 */
export function formatLargeNumber(value: unknown): string {
  const num = safeParseNumber(value, 0);

  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toString();
}

// ============================================
// CLAMPING UTILITIES
// ============================================

/**
 * Clamp a number between min and max
 */
export function clamp(value: unknown, min: number, max: number): number {
  const num = safeParseNumber(value, min);
  return Math.max(min, Math.min(max, num));
}

/**
 * Clamp trust score (0-100)
 */
export function clampTrustScore(value: unknown): number {
  return clamp(value, 0, 100);
}

/**
 * Clamp verification level (0-4)
 */
export function clampVerificationLevel(value: unknown): number {
  return Math.round(clamp(value, 0, 4));
}

/**
 * Clamp equity percentage (0-100)
 */
export function clampEquityPercent(value: unknown): number {
  return clamp(value, 0, 100);
}
