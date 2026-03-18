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
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2E8B57"/>
          <stop offset="100%" stopColor="#0047AB"/>
        </linearGradient>
      </defs>
      {/* Outer sphere ring */}
      <circle
        cx="128"
        cy="128"
        r="110"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        opacity="0.12"
        className={cn(animate && "animate-[spin_20s_linear_infinite]")}
        style={{ transformOrigin: '128px 128px' }}
      />
      {/* Main sphere body */}
      <circle cx="128" cy="128" r="88" fill="url(#logoGrad)"/>
      {/* Meridian lines */}
      <ellipse cx="128" cy="128" rx="88" ry="40" stroke="white" strokeWidth="2.5" fill="none" opacity="0.25"/>
      <ellipse cx="128" cy="128" rx="40" ry="88" stroke="white" strokeWidth="2.5" fill="none" opacity="0.25"/>
      {/* Horizontal equator */}
      <line x1="40" y1="128" x2="216" y2="128" stroke="white" strokeWidth="2" opacity="0.2"/>
      {/* Three nodes (founders, talent, investors) */}
      <circle cx="128" cy="72" r="14" fill="white" opacity="0.9"/>
      <circle cx="80" cy="160" r="14" fill="white" opacity="0.9"/>
      <circle cx="176" cy="160" r="14" fill="white" opacity="0.9"/>
      {/* Connection lines */}
      <line x1="128" y1="86" x2="80" y2="146" stroke="white" strokeWidth="3" opacity="0.6" strokeLinecap="round"/>
      <line x1="128" y1="86" x2="176" y2="146" stroke="white" strokeWidth="3" opacity="0.6" strokeLinecap="round"/>
      <line x1="94" y1="160" x2="162" y2="160" stroke="white" strokeWidth="3" opacity="0.6" strokeLinecap="round"/>
      {/* Center trust dot */}
      <circle cx="128" cy="132" r="8" fill="white" opacity="0.95"/>
      {/* Subtle highlight */}
      <ellipse cx="105" cy="95" rx="35" ry="25" fill="white" opacity="0.08" transform="rotate(-25 105 95)"/>
    </svg>
  );
}
