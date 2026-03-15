'use client';

import { useState } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShieldCheck, BadgeCheck, CheckCircle2, Sparkles } from 'lucide-react';

interface AlloySphereVerifiedBadgeProps {
    verified: boolean;
    verifiedAt?: string;
    variant?: 'compact' | 'full' | 'inline';
    className?: string;
}

export function AlloySphereVerifiedBadge({
    verified,
    verifiedAt,
    variant = 'full',
    className = '',
}: AlloySphereVerifiedBadgeProps) {
    const [isHovered, setIsHovered] = useState(false);

    if (!verified) {
        return variant === 'full' ? (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 ${className}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Not Verified
            </div>
        ) : null;
    }

    // Inline variant — Instagram-style small blue tick
    if (variant === 'inline') {
        return (
            <span
                className={`inline-flex items-center justify-center shrink-0 ${className}`}
                title="AlloySphere Verified"
                style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
                }}
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
        );
    }

    const formattedDate = verifiedAt
        ? new Date(verifiedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
        : null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}
                    >
                        {/* 3D Badge Shield */}
                        <div
                            className="relative"
                            style={{
                                perspective: '600px',
                            }}
                        >
                            {/* Glow ring */}
                            <div
                                className="absolute inset-0 rounded-full badge-glow"
                                style={{
                                    background: 'var(--verified-gradient)',
                                    opacity: 0.2,
                                    filter: 'blur(6px)',
                                    transform: 'scale(1.3)',
                                }}
                            />

                            {/* Shield icon container */}
                            <div
                                className="relative flex items-center justify-center rounded-full"
                                style={{
                                    width: variant === 'compact' ? '28px' : '34px',
                                    height: variant === 'compact' ? '28px' : '34px',
                                    background: 'var(--verified-gradient)',
                                    transform: isHovered
                                        ? 'perspective(600px) rotateY(15deg) scale(1.1)'
                                        : 'perspective(600px) rotateY(0deg) scale(1)',
                                    transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                                    boxShadow: '0 4px 14px -2px rgba(46, 139, 87, 0.4), 0 2px 6px -1px rgba(0, 71, 171, 0.3)',
                                }}
                            >
                                <BadgeCheck
                                    className="text-white"
                                    style={{
                                        width: variant === 'compact' ? '16px' : '20px',
                                        height: variant === 'compact' ? '16px' : '20px',
                                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                                    }}
                                />

                                {/* Sparkle effect on hover */}
                                {isHovered && (
                                    <Sparkles
                                        className="absolute -top-1 -right-1 text-yellow-300"
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            animation: 'float3d 1s ease-in-out infinite',
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Text label (full variant only) */}
                        {variant === 'full' && (
                            <div className="flex flex-col">
                                <span
                                    className="text-xs font-bold uppercase tracking-wider shimmer-text"
                                    style={{ lineHeight: '1.2' }}
                                >
                                    AlloySphere Verified
                                </span>
                                {formattedDate && (
                                    <span className="text-caption text-muted-foreground" style={{ lineHeight: '1.2' }}>
                                        Since {formattedDate}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </TooltipTrigger>

                <TooltipContent
                    className="max-w-xs p-0 overflow-hidden border-0"
                    side="bottom"
                    sideOffset={8}
                >
                    {/* Glassmorphic tooltip */}
                    <div
                        className="p-4 space-y-3"
                        style={{
                            background: 'linear-gradient(135deg, rgba(46, 139, 87, 0.95) 0%, rgba(0, 71, 171, 0.95) 100%)',
                            backdropFilter: 'blur(16px)',
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <BadgeCheck className="h-5 w-5 text-white" />
                            <span className="font-bold text-white text-sm">
                                AlloySphere Verified ✓
                            </span>
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed">
                            This startup has been <strong className="text-white">physically verified</strong> by the AlloySphere team.
                            Our team conducted an on-site visit, background checks, and document verification
                            to confirm this startup is genuine and trustworthy.
                        </p>
                        <div className="flex items-center gap-3 pt-1 border-t border-white/20">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
                                <span className="text-caption text-white/70">Background Check</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
                                <span className="text-caption text-white/70">On-site Visit</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
                                <span className="text-caption text-white/70">Identity Verified</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
                                <span className="text-caption text-white/70">Doc Verified</span>
                            </div>
                        </div>
                        {formattedDate && (
                            <p className="text-caption text-white/50 pt-1 border-t border-white/10">
                                Verified on {formattedDate}
                            </p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
