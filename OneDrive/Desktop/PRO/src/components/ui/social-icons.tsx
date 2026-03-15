import React from 'react';
import { Github, Linkedin, Instagram, Globe } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SocialIconProps {
  href: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
};

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function PremiumLinkedIn({ href, className, size = 'md' }: SocialIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-center bg-white/50 border border-white/40 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(0,119,181,0.2)] group",
        sizeClasses[size],
        className
      )}
    >
      <Linkedin className={cn("text-muted-foreground transition-colors group-hover:text-[#0A66C2]", iconSizes[size])} />
    </a>
  );
}

export function PremiumGithub({ href, className, size = 'md' }: SocialIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-center bg-white/50 border border-white/40 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md group",
        sizeClasses[size],
        className
      )}
    >
      <Github className={cn("text-muted-foreground transition-colors group-hover:text-black dark:group-hover:text-white", iconSizes[size])} />
    </a>
  );
}

export function PremiumInstagram({ href, className, size = 'md' }: SocialIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-center bg-white/50 border border-white/40 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden",
        sizeClasses[size],
        className
      )}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
        }}
      />
      <Instagram className={cn("text-muted-foreground transition-colors group-hover:text-white relative z-10", iconSizes[size])} />
    </a>
  );
}

export function PremiumGlobe({ href, className, size = 'md' }: SocialIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-center bg-white/50 border border-white/40 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(46,139,87,0.2)] group",
        sizeClasses[size],
        className
      )}
    >
      <Globe className={cn("text-muted-foreground transition-colors group-hover:text-[var(--sea-green)]", iconSizes[size])} />
    </a>
  );
}
