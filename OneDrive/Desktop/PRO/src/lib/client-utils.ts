/**
 * Client-side utility functions
 * Safe guards for SSR/CSR compatibility
 */

/**
 * Check if running on client side
 */
export const isClient = typeof window !== 'undefined';

/**
 * Safely access localStorage
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage.getItem error:', e);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage.setItem error:', e);
    }
  },
  
  removeItem: (key: string): void => {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage.removeItem error:', e);
    }
  },
  
  clear: (): void => {
    if (!isClient) return;
    try {
      localStorage.clear();
    } catch (e) {
      console.error('localStorage.clear error:', e);
    }
  }
};

/**
 * Safe session storage access
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.error('sessionStorage.getItem error:', e);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.error('sessionStorage.setItem error:', e);
    }
  },
  
  removeItem: (key: string): void => {
    if (!isClient) return;
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.error('sessionStorage.removeItem error:', e);
    }
  }
};

/**
 * Hook-friendly storage key constants
 */
export const STORAGE_KEYS = {
  TOKEN: 'collabhub-token',
  VIEW_PROFILE: 'viewProfile',
  OPEN_CONVERSATION: 'openConversation',
  MESSAGE_USER: 'messageUser',
} as const;

/**
 * Division by zero safe helper
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (denominator === 0 || isNaN(denominator) || isNaN(numerator)) {
    return fallback;
  }
  return numerator / denominator;
}

/**
 * Safe percentage calculation
 */
export function safePercentage(value: number, total: number): number {
  return Math.round(safeDivide(value, total, 0) * 100);
}

/**
 * Format currency safely
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number safely
 */
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Safe string truncate
 */
export function truncate(str: string | undefined | null, maxLength: number = 100): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Generate initials from name
 */
export function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
