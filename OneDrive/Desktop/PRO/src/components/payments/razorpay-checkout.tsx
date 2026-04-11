'use client';

/**
 * Razorpay Checkout Integration
 * Dynamically loads checkout.js and opens the payment modal.
 */

import { useCallback, useEffect, useRef } from 'react';

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
 * Hook to load and use Razorpay Checkout.
 */
export function useRazorpayCheckout() {
  const scriptLoaded = useRef(false);

  // Load Razorpay script
  useEffect(() => {
    if (scriptLoaded.current || typeof window === 'undefined') return;
    if (document.querySelector(`script[src="${RAZORPAY_CHECKOUT_URL}"]`)) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
    };
    document.body.appendChild(script);
  }, []);

  const openCheckout = useCallback((options: RazorpayCheckoutOptions) => {
    if (!window.Razorpay) {
      console.error('Razorpay SDK not loaded');
      options.onFailure?.({ error: 'Payment SDK not loaded. Please refresh the page.' });
      return;
    }

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      console.error('Razorpay key not configured');
      options.onFailure?.({ error: 'Payment configuration error' });
      return;
    }

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
      },
      handler: function (response: RazorpaySuccessResponse) {
        options.onSuccess(response);
      },
    });

    rzp.on('payment.failed', function (response: any) {
      options.onFailure?.(response.error);
    });

    rzp.open();
  }, []);

  return { openCheckout, isReady: scriptLoaded.current };
}
