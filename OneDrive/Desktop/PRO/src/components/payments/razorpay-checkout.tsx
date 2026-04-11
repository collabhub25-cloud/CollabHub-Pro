'use client';

/**
 * Razorpay Checkout Integration
 * Dynamically loads checkout.js and opens the payment modal.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutOptions {
  orderId: string;
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Load the Razorpay script with retry logic.
 * Returns a promise that resolves when the script is loaded.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // Already loaded
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    // Check if script tag exists
    const existingScript = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_URL}"]`);
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      // If already loaded
      if (window.Razorpay) {
        resolve(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

/**
 * Hook to load and use Razorpay Checkout.
 */
export function useRazorpayCheckout() {
  const [isReady, setIsReady] = useState(false);

  // Load Razorpay script on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    loadRazorpayScript().then((loaded) => {
      setIsReady(loaded);
    });
  }, []);

  const openCheckout = useCallback(async (options: RazorpayCheckoutOptions) => {
    // Ensure script is loaded before opening
    if (!window.Razorpay) {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        console.error('Razorpay SDK failed to load');
        options.onFailure?.({ error: 'Payment SDK not loaded. Please refresh the page and try again.' });
        return;
      }
    }

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      console.error('Razorpay key not configured');
      options.onFailure?.({ error: 'Payment configuration error. Please contact support.' });
      return;
    }

    try {
      const rzp = new window.Razorpay({
        key,
        amount: options.amount,
        currency: options.currency || 'INR',
        name: options.name || 'AlloySphere',
        description: options.description || 'Payment',
        order_id: options.orderId,
        prefill: options.prefill || {},
        theme: {
          color: options.theme?.color || '#6366f1',
        },
        modal: {
          ondismiss: () => {
            options.onDismiss?.();
          },
          confirm_close: true, // Ask user before closing
        },
        handler: function (response: RazorpaySuccessResponse) {
          options.onSuccess(response);
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
      });

      rzp.on('payment.failed', function (response: any) {
        options.onFailure?.(response.error);
      });

      rzp.open();
    } catch (err) {
      console.error('Failed to open Razorpay checkout:', err);
      options.onFailure?.({ error: 'Failed to open payment window. Please try again.' });
    }
  }, []);

  return { openCheckout, isReady };
}
