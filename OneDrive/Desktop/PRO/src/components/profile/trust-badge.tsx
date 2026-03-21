'use client';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { ShieldAlert, ShieldCheck, Shield, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function TrustBadge({ score }: { score: number }) {
    // Determine tier — Bronze / Silver / Gold / Platinum
    let tier = "Bronze";
    let color = "text-orange-600";
    let bg = "bg-orange-500/10";
    let Icon = Shield;
    let description = "Starting your AlloySphere journey. Build trust by verifying identity and completing milestones.";
    let glowColor = 'rgba(234, 88, 12, 0.15)';

    if (score >= 90) {
        tier = "Platinum";
        color = "text-purple-500";
        bg = "bg-purple-500/10";
        Icon = Zap;
        description = "Top-tier trusted member. Exceptional history of completed agreements and verified identity.";
        glowColor = 'rgba(139, 92, 246, 0.25)';
    } else if (score >= 70) {
        tier = "Gold";
        color = "";
        bg = "";
        Icon = ShieldCheck;
        description = "Consistently reliable member with verified identity and successful collaborations.";
        glowColor = 'rgba(46, 139, 87, 0.25)';
    } else if (score >= 40) {
        tier = "Silver";
        color = "";
        bg = "";
        Icon = Shield;
        description = "Identity verified. Building a track record of reliable collaborations.";
        glowColor = 'rgba(0, 71, 171, 0.2)';
    } else if (score < 20) {
        tier = "Unverified";
        color = "text-red-500";
        bg = "bg-red-500/10";
        Icon = ShieldAlert;
        description = "Low trust score. Complete verification and resolve disputes to improve.";
        glowColor = 'rgba(239, 68, 68, 0.15)';
    }

    // Sea green / cobalt blue for Silver & Gold
    const useGradient = tier === 'Silver' || tier === 'Gold';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={`flex items-center gap-2 cursor-help transition-all duration-300 px-3 py-1.5 rounded-full border card-3d-hover
                            ${useGradient ? 'border-transparent text-white' : `${bg} ${color} border-current/20`}`}
                        style={{
                            ...(useGradient
                                ? {
                                    background: tier === 'Gold'
                                        ? 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)'
                                        : 'linear-gradient(135deg, #0047AB 0%, #2563EB 100%)',
                                    boxShadow: `0 4px 12px -2px ${glowColor}`,
                                }
                                : {}),
                            transformStyle: 'preserve-3d',
                        }}
                    >
                        <Icon className="h-4 w-4" style={{ filter: useGradient ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : undefined }} />
                        <span className="font-semibold text-sm">{score}</span>
                        <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline-block">
                            {tier}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-4 space-y-3 bg-white dark:bg-slate-900 border-border">
                    <div className="flex items-center justify-between font-semibold">
                        <span className={useGradient ? 'shimmer-text' : color}>{tier}</span>
                        <span className="text-foreground">{score}/100</span>
                    </div>
                    <Progress value={score} className="h-2" />
                    <p className="text-sm text-foreground leading-snug">
                        {description}
                    </p>
                    <p className="text-xs text-muted-foreground border-t pt-2">
                        <strong className="text-foreground">What affects trust score?</strong> Verification level, completed milestones, signed agreements, alliance count, AlloySphere verification, and dispute history.
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
