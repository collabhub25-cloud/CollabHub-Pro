'use client';

import { CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface PaymentStatusProps {
  status: 'success' | 'failure' | 'processing';
  amount?: number; // in paise
  purpose?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onContinue?: () => void;
}

export function PaymentStatus({
  status,
  amount,
  purpose,
  errorMessage,
  onRetry,
  onContinue,
}: PaymentStatusProps) {
  // Confetti on success
  useEffect(() => {
    if (status === 'success') {
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#6366f1', '#8b5cf6', '#a78bfa'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#6366f1', '#8b5cf6', '#a78bfa'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [status]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center text-center p-8 space-y-6"
      >
        {/* Icon */}
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-2 rounded-full bg-emerald-400/20 animate-ping" />
          </motion.div>
        )}

        {status === 'failure' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <XCircle className="w-10 h-10 text-white" />
            </div>
          </motion.div>
        )}

        {status === 'processing' && (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {status === 'success' && 'Payment Successful! 🎉'}
            {status === 'failure' && 'Payment Failed'}
            {status === 'processing' && 'Processing Payment...'}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {status === 'success' &&
              `Your payment of ₹${amount ? (amount / 100).toLocaleString('en-IN') : '—'} for ${purpose || 'the service'} has been processed successfully.`}
            {status === 'failure' &&
              (errorMessage || 'Something went wrong with your payment. Please try again.')}
            {status === 'processing' &&
              'Please wait while we verify your payment. Do not close this window.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {status === 'success' && onContinue && (
            <Button
              onClick={onContinue}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {status === 'failure' && onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
