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
    let description = "Starting your CollabHub journey. Build trust by verifying identity and completing milestones.";

    if (score >= 90) {
        tier = "Platinum";
        color = "text-purple-500";
        bg = "bg-purple-500/10";
        Icon = Zap;
        description = "Top-tier trusted member. Exceptional history of completed agreements and verified identity.";
    } else if (score >= 70) {
        tier = "Gold";
        color = "text-yellow-500";
        bg = "bg-yellow-500/10";
        Icon = ShieldCheck;
        description = "Consistently reliable member with verified identity and successful collaborations.";
    } else if (score >= 40) {
        tier = "Silver";
        color = "text-blue-500";
        bg = "bg-blue-500/10";
        Icon = Shield;
        description = "Identity verified. Building a track record of reliable collaborations.";
    } else if (score < 20) {
        tier = "Unverified";
        color = "text-red-500";
        bg = "bg-red-500/10";
        Icon = ShieldAlert;
        description = "Low trust score. Complete verification and resolve disputes to improve.";
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`flex items-center gap-2 cursor-help transition-all hover:scale-105 ${bg} ${color} px-3 py-1.5 rounded-full border border-current/20`}>
                        <Icon className="h-4 w-4" />
                        <span className="font-semibold text-sm">{score}</span>
                        <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline-block">
                            {tier}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-4 space-y-3">
                    <div className="flex items-center justify-between font-semibold">
                        <span className={color}>{tier}</span>
                        <span>{score}/100</span>
                    </div>
                    <Progress value={score} className="h-2" />
                    <p className="text-sm text-muted-foreground leading-snug">
                        {description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 border-t pt-2">
                        <strong>What affects trust score?</strong> Verification level, completed milestones, signed agreements, alliance count, and dispute history.
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
