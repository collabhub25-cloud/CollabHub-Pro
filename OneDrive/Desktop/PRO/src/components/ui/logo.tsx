import React from 'react';
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export function Logo({ className, size = 32, animate = true }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
        className={cn(animate && "animate-[spin_10s_linear_infinite]")}
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="4" r="2" fill="currentColor" />
      <circle cx="12" cy="20" r="2" fill="currentColor" />
      <line x1="12" y1="9" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="15" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
