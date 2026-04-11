'use client';

import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  onDismiss?: () => void;
}

export function UpgradePrompt({ feature, description, onDismiss }: UpgradePromptProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-6 backdrop-blur-sm"
      >
        {/* Dismiss */}
        <button
          onClick={() => { setVisible(false); onDismiss?.(); }}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-sm">
                Unlock {feature}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {description || `Upgrade to Startup Boost (₹1,999/month) to access ${feature.toLowerCase()} and more premium features.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/pricing">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-xs h-8"
                >
                  View Plans <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
              <span className="text-[11px] text-muted-foreground">
                Starting at ₹1,999/mo
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
