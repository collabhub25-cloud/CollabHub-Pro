import React from 'react';
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export function Logo({ className, size = 32, animate = true }: LogoProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0",
        animate && "group",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Glow effect behind the logo */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full blur-md opacity-40 bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 transition-opacity duration-500",
          animate && "group-hover:opacity-70"
        )} 
      />
      
      {/* 3D-ish Premium Star Logo shape */}
      {/* Source paths built to represent a premium metallic/glowing 3D star */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "relative z-10 drop-shadow-lg transition-transform duration-500",
          animate && "group-hover:scale-110 group-hover:rotate-12"
        )}
      >
        <defs>
          {/* Main Gold Gradient */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF176" />
            <stop offset="30%" stopColor="#FFD54F" />
            <stop offset="70%" stopColor="#FFCA28" />
            <stop offset="100%" stopColor="#FFB300" />
          </linearGradient>
          
          {/* Highlight Gradient for 3D POP */}
          <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Shadow Gradient for Depth */}
          <radialGradient id="starShadow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#E65100" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF8F00" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center glowing shadow to build volume behind center */}
        <circle cx="50" cy="50" r="25" fill="url(#starShadow)" />

        <path
          d="M50 5
             L61 38 
             L95 38 
             L68 58 
             L78 90 
             L50 70 
             L22 90 
             L32 58 
             L5 38 
             L39 38 
             Z"
          fill="url(#goldGradient)"
          stroke="#FF8F00"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Inner highlight for premium glossy 3D curve effect */}
        <path
           d="M50 7
              L60.5 39 
              L93 39 
              L67 58 
              L76 88 
              L50 69 
              L24 88 
              L33 58 
              L7 39 
              L39.5 39 
              Z"
          fill="url(#highlight)"
          className="mix-blend-overlay"
        />

        {/* Center Accent specific to AlloySphere */}
        <circle cx="50" cy="50" r="10" fill="#FFFFFF" opacity="0.9" />
        <circle cx="50" cy="50" r="6" fill="url(#goldGradient)" />
      </svg>
    </div>
  );
}
