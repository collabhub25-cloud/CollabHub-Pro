import { describe, it, expect } from 'vitest';
import {
  safeParseNumber,
  safeAdd,
  safeSubtract,
  safeMultiply,
  safeDivide,
  safePercentage,
  safeAverage,
  safeSum,
  safeCount,
  safeMin,
  safeMax,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatLargeNumber,
  clamp,
  clampTrustScore,
  clampVerificationLevel,
  clampEquityPercent,
} from '@/lib/safe-math';

// ============================================
// safeParseNumber
// ============================================
describe('safeParseNumber', () => {
  it('returns the number when given a valid number', () => {
    expect(safeParseNumber(42)).toBe(42);
    expect(safeParseNumber(-3.14)).toBe(-3.14);
    expect(safeParseNumber(0)).toBe(0);
  });

  it('parses valid numeric strings', () => {
    expect(safeParseNumber('100')).toBe(100);
    expect(safeParseNumber('3.14')).toBe(3.14);
    expect(safeParseNumber('-7')).toBe(-7);
  });

  it('returns fallback for NaN and Infinity', () => {
    expect(safeParseNumber(NaN)).toBe(0);
    expect(safeParseNumber(Infinity)).toBe(0);
    expect(safeParseNumber(-Infinity)).toBe(0);
    expect(safeParseNumber(NaN, 99)).toBe(99);
  });

  it('returns fallback for non-numeric values', () => {
    expect(safeParseNumber('hello')).toBe(0);
    expect(safeParseNumber(null)).toBe(0);
    expect(safeParseNumber(undefined)).toBe(0);
    expect(safeParseNumber({})).toBe(0);
    expect(safeParseNumber([])).toBe(0);
    expect(safeParseNumber(true)).toBe(0);
  });

  it('uses custom fallback', () => {
    expect(safeParseNumber('abc', 42)).toBe(42);
    expect(safeParseNumber(null, -1)).toBe(-1);
  });
});

// ============================================
// ARITHMETIC
// ============================================
describe('safeAdd', () => {
  it('adds two valid numbers', () => {
    expect(safeAdd(2, 3)).toBe(5);
    expect(safeAdd('10', '20')).toBe(30);
  });

  it('handles invalid inputs', () => {
    expect(safeAdd('abc', 5)).toBe(5);
    expect(safeAdd(null, null)).toBe(0);
  });
});

describe('safeSubtract', () => {
  it('subtracts two valid numbers', () => {
    expect(safeSubtract(10, 3)).toBe(7);
    expect(safeSubtract('50', '20')).toBe(30);
  });
});

describe('safeMultiply', () => {
  it('multiplies two valid numbers', () => {
    expect(safeMultiply(4, 5)).toBe(20);
    expect(safeMultiply('3', '7')).toBe(21);
  });

  it('returns 0 when one operand is invalid', () => {
    expect(safeMultiply('abc', 5)).toBe(0);
  });
});

describe('safeDivide', () => {
  it('divides two valid numbers', () => {
    expect(safeDivide(10, 2)).toBe(5);
    expect(safeDivide('100', '4')).toBe(25);
  });

  it('returns fallback on divide by zero', () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 0, -1)).toBe(-1);
  });

  it('returns fallback for invalid inputs', () => {
    expect(safeDivide('abc', 5)).toBe(0);
  });
});

// ============================================
// AGGREGATE
// ============================================
describe('safePercentage', () => {
  it('calculates percentage correctly', () => {
    expect(safePercentage(50, 200)).toBe(25);
    expect(safePercentage(1, 3)).toBeCloseTo(33.33, 1);
  });

  it('returns fallback when total is zero', () => {
    expect(safePercentage(10, 0)).toBe(0);
  });
});

describe('safeAverage', () => {
  it('calculates average', () => {
    expect(safeAverage([10, 20, 30])).toBe(20);
    expect(safeAverage([5])).toBe(5);
  });

  it('handles invalid values as zero', () => {
    // 'abc' parses to 0 via default fallback, so average is (10+0+30)/3
    expect(safeAverage([10, 'abc', 30])).toBeCloseTo(13.33, 1);
  });

  it('returns fallback for empty arrays', () => {
    expect(safeAverage([])).toBe(0);
    expect(safeAverage([], 99)).toBe(99);
  });

  it('returns fallback for non-arrays', () => {
    expect(safeAverage(null as unknown as unknown[])).toBe(0);
  });
});

describe('safeSum', () => {
  it('sums valid numbers', () => {
    expect(safeSum([1, 2, 3, 4])).toBe(10);
    expect(safeSum(['10', '20'])).toBe(30);
  });

  it('ignores non-finite values', () => {
    expect(safeSum([1, NaN, 2, Infinity, 3])).toBe(6);
  });

  it('returns fallback for non-array', () => {
    expect(safeSum('not-array' as unknown as unknown[])).toBe(0);
  });
});

describe('safeCount', () => {
  it('returns array length', () => {
    expect(safeCount([1, 2, 3])).toBe(3);
    expect(safeCount([])).toBe(0);
  });

  it('returns 0 for non-array', () => {
    expect(safeCount(null as unknown as unknown[])).toBe(0);
  });
});

describe('safeMin', () => {
  it('returns minimum value', () => {
    expect(safeMin([5, 3, 8, 1])).toBe(1);
    expect(safeMin([100])).toBe(100);
  });

  it('returns fallback for empty array', () => {
    expect(safeMin([])).toBe(0);
    expect(safeMin([], 99)).toBe(99);
  });
});

describe('safeMax', () => {
  it('returns maximum value', () => {
    expect(safeMax([5, 3, 8, 1])).toBe(8);
    expect(safeMax([-10, -5])).toBe(-5);
  });

  it('returns fallback for empty array', () => {
    expect(safeMax([])).toBe(0);
  });
});

// ============================================
// FORMATTING
// ============================================
describe('formatCurrency', () => {
  it('formats USD by default', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1,500');
  });

  it('handles invalid input gracefully', () => {
    const result = formatCurrency(null);
    expect(result).toBeTruthy();
  });
});

describe('formatNumber', () => {
  it('formats numbers with separators', () => {
    // Use toContain for locale independence (Indian vs Western grouping)
    const formatted = formatNumber(1000000);
    expect(formatted).toContain('000');
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatPercentage', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercentage(75)).toBe('75.0%');
    expect(formatPercentage(33.333, 2)).toBe('33.33%');
  });
});

describe('formatLargeNumber', () => {
  it('formats billions', () => {
    expect(formatLargeNumber(2_500_000_000)).toBe('2.5B');
  });

  it('formats millions', () => {
    expect(formatLargeNumber(3_700_000)).toBe('3.7M');
  });

  it('formats thousands', () => {
    expect(formatLargeNumber(15_000)).toBe('15.0K');
  });

  it('returns raw number under 1000', () => {
    expect(formatLargeNumber(999)).toBe('999');
    expect(formatLargeNumber(0)).toBe('0');
  });
});

// ============================================
// CLAMPING
// ============================================
describe('clamp', () => {
  it('clamps within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles invalid input', () => {
    expect(clamp('abc', 0, 100)).toBe(0);
  });
});

describe('clampTrustScore', () => {
  it('clamps between 0 and 100', () => {
    expect(clampTrustScore(50)).toBe(50);
    expect(clampTrustScore(-10)).toBe(0);
    expect(clampTrustScore(150)).toBe(100);
  });
});

describe('clampVerificationLevel', () => {
  it('clamps between 0 and 4, rounded', () => {
    expect(clampVerificationLevel(2)).toBe(2);
    expect(clampVerificationLevel(5)).toBe(4);
    expect(clampVerificationLevel(-1)).toBe(0);
    expect(clampVerificationLevel(2.7)).toBe(3);
  });
});

describe('clampEquityPercent', () => {
  it('clamps between 0 and 100', () => {
    expect(clampEquityPercent(50)).toBe(50);
    expect(clampEquityPercent(-5)).toBe(0);
    expect(clampEquityPercent(120)).toBe(100);
  });
});
