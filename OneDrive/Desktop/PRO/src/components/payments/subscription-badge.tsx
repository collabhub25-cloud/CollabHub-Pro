'use client';

import { Zap } from 'lucide-react';

interface SubscriptionBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function SubscriptionBadge({ className = '', size = 'sm' }: SubscriptionBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-1 gap-1';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm ${sizeClasses} ${className}`}
    >
      <Zap className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} fill="currentColor" />
      Boosted
    </span>
  );
}
