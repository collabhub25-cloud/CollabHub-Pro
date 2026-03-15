import React from 'react';
import { cn } from "@/lib/utils";

interface TrustScoreIconProps {
  className?: string;
  size?: number;
}

export function TrustScoreIcon({ className, size = 18 }: TrustScoreIconProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 group transition-transform hover:scale-110",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* 3D-ish Premium Star Trust Score shape */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:rotate-12"
      >
        <defs>
          <linearGradient id="trustGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF176" />
            <stop offset="30%" stopColor="#FFD54F" />
            <stop offset="70%" stopColor="#FFCA28" />
            <stop offset="100%" stopColor="#FFB300" />
          </linearGradient>
          
          <linearGradient id="trustHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="trustStarShadow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#E65100" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF8F00" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center glowing shadow */}
        <circle cx="50" cy="50" r="25" fill="url(#trustStarShadow)" />

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
          fill="url(#trustGoldGradient)"
          stroke="#FF8F00"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Inner highlight */}
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
          fill="url(#trustHighlight)"
          className="mix-blend-overlay"
        />

        <circle cx="50" cy="50" r="10" fill="#FFFFFF" opacity="0.9" />
        <circle cx="50" cy="50" r="6" fill="url(#trustGoldGradient)" />
      </svg>
    </div>
  );
}
