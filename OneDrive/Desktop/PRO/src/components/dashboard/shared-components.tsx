'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LucideIcon, ArrowUpRight, Sparkles } from 'lucide-react';
import { PlanType, getPlanDisplayName, FOUNDER_PLAN_FEATURES, FounderPlanType } from '@/lib/subscription/features';
import type { UserRole } from '@/lib/models';

// ============================================
// TYPES
// ============================================

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  tooltip?: string;
  progress?: number;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface SubscriptionBadgeProps {
  plan: PlanType | null;
  role?: UserRole;
}

export interface PlanLimitDisplayProps {
  plan: PlanType | null;
  role?: UserRole;
  feature: 'maxProjects' | 'maxTeamMembers' | 'maxAlliances';
  currentCount: number;
}

// ============================================
// STAT CARD COMPONENT
// ============================================

export const StatCard = React.memo(function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  tooltip,
  progress,
  loading = false,
  className = '',
  onClick,
}: StatCardProps) {
  const cardContent = (
    <Card className={`h-full transition-all ${onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm' : ''} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <>
            <div className="text-xl font-semibold">
              {value}
            </div>
            {(description || trend) && (
              <div className="flex items-center gap-1 mt-1">
                {trend && (
                  <span className={`text-xs flex items-center ${trend.positive !== false ? 'text-green-600' : 'text-red-600'}`}>
                    <ArrowUpRight className={`h-3 w-3 ${trend.positive === false ? 'rotate-180' : ''}`} />
                    {trend.value > 0 ? '+' : ''}{trend.value}
                  </span>
                )}
                {description && (
                  <span className="text-xs text-muted-foreground">
                    {trend ? trend.label : description}
                  </span>
                )}
              </div>
            )}
            {typeof progress === 'number' && (
              <Progress value={progress} className="h-2 mt-3" />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
});
// ============================================

export function StatCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm mb-4">{description}</p>
        {action && (
          <InteractiveHoverButton text={action.label} onClick={action.onClick} className="w-44" />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// SUBSCRIPTION BADGE COMPONENT
// ============================================

const PLAN_COLORS: Record<string, string> = {
  free_founder: 'bg-gray-500 text-white',
  pro_founder: 'bg-blue-500 text-white',
  scale_founder: 'bg-purple-500 text-white',
  enterprise_founder: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  // Legacy support
  free: 'bg-gray-500 text-white',
  pro: 'bg-blue-500 text-white',
  scale: 'bg-purple-500 text-white',
  premium: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
};

export function SubscriptionBadge({ plan, role }: SubscriptionBadgeProps) {
  if (role && role !== 'founder') {
    return (
      <Badge className="bg-green-500 text-white font-medium">
        Free
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className="bg-gray-500 text-white font-medium">
        Free
      </Badge>
    </div>
  );
}

// ============================================
// PLAN LIMIT DISPLAY COMPONENT
// ============================================

export function PlanLimitDisplay({
  role,
  feature,
  currentCount,
}: PlanLimitDisplayProps) {
  // Non-founders have no limits
  if (role && role !== 'founder') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{feature.replace('max', '')}</span>
          <span className="text-green-500">Unlimited</span>
        </div>
        <p className="text-xs text-muted-foreground">Free accounts have no limits</p>
      </div>
    );
  }

  // Founders: 1 project, 20 team members, unlimited alliances
  let limit = -1;
  if (feature === 'maxProjects') limit = 1;
  else if (feature === 'maxTeamMembers') limit = 20;

  const isUnlimited = limit === -1;
  const isExceeded = !isUnlimited && currentCount >= limit;
  const percentage = isUnlimited ? 0 : Math.min((currentCount / limit) * 100, 100);

  const featureLabels: Record<string, string> = {
    maxProjects: 'Projects',
    maxTeamMembers: 'Team Members',
    maxAlliances: 'Alliances',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{featureLabels[feature]}</span>
        <span className={isExceeded ? 'text-red-500 font-medium' : ''}>
          {currentCount} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={`h-2 ${isExceeded ? '[&>div]:bg-red-500' : percentage >= 80 ? '[&>div]:bg-yellow-500' : ''}`}
        />
      )}
    </div>
  );
}

// ============================================
// CONTENT SKELETON GRID
// ============================================

export function StatCardGrid({ children, columns = 4 }: { children: React.ReactNode; columns?: 2 | 3 | 4 }) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {children}
    </div>
  );
}

export function StatCardSkeletonGrid({ count = 4, columns = 4 }: { count?: number; columns?: 2 | 3 | 4 }) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================
// LIST SKELETON
// ============================================

export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// TABLE SKELETON
// ============================================

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD HEADER COMPONENT
// ============================================

export function DashboardHeader({
  title,
  description,
  action,
  subscription,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  subscription?: {
    plan: PlanType | null;
    role?: UserRole;
  };
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {subscription && (
          <SubscriptionBadge
            plan={subscription.plan}
            role={subscription.role}
          />
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

// ============================================
// SAFE NUMBER DISPLAY (prevents NaN)
// ============================================

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

export function safePercent(value: unknown, total: unknown, fallback = 0): number {
  const v = safeNumber(value);
  const t = safeNumber(total);
  if (t === 0) return fallback;
  return Math.round((v / t) * 100);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Short currency format: ₹1.2Cr, ₹5.0L, ₹25K, ₹500 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// ============================================
// DASHBOARD-SPECIFIC SHARED COMPONENTS
// ============================================

export const QuickActionCard = React.memo(function QuickActionCard({ icon: Icon, label, description, onClick }: {
  icon: any; label: string; description: string; onClick: () => void;
}) {
  return (
    <Card
      className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
});

export const StatsCard = React.memo(function StatsCard({ icon: Icon, iconColor, label, value, subtext, trend, trendPositive, progress, onClick }: {
  icon: any; iconColor: string; label: string; value: string | number; subtext: string;
  trend?: string; trendPositive?: boolean; progress?: number; onClick: () => void;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`h-10 w-10 rounded-lg ${iconColor.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
            <p className="text-[10px] text-muted-foreground mt-1">{progress}% completion</p>
          </div>
        )}
        {trend && (
          <p className={`text-xs mt-2 ${trendPositive ? 'text-green-500' : 'text-red-500'}`}>↗ {trend}</p>
        )}
      </CardContent>
    </Card>
  );
});

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pending' },
    accepted: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Accepted' },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Rejected' },
    shortlisted: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Shortlisted' },
    completed: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Completed' },
    in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'In Progress' },
  };
  const { bg, text, label } = config[status] || config.pending;
  return <Badge className={`${bg} ${text} border-0 text-[10px]`}>{label}</Badge>;
}

export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500',
    accepted: 'bg-green-500',
    rejected: 'bg-red-500',
    shortlisted: 'bg-blue-500',
    completed: 'bg-green-500',
    in_progress: 'bg-blue-500',
  };
  return <span className={`h-2 w-2 rounded-full ${colors[status] || 'bg-gray-500'}`} />;
}
