/**
 * Subscription Plan Features Configuration
 * 
 * NEW MONETIZATION MODEL (2024):
 * - Founders: Paid subscription plans (free_founder, pro_founder, scale_founder, enterprise_founder)
 * - Talent: Free (no subscription required)
 * - Investor: Free (no subscription required)
 * - Admin: Free (no subscription required)
 */

import type { UserRole } from '@/lib/models';

// ============================================
// FOUNDER PLAN TYPES
// ============================================

export type FounderPlanType = 'free_founder' | 'pro_founder' | 'scale_founder' | 'enterprise_founder';

// Legacy PlanType for backward compatibility
export type PlanType = FounderPlanType | 'free';

export type FeatureKey = keyof typeof FOUNDER_PLAN_FEATURES.free_founder;

// ============================================
// FOUNDER PLAN FEATURES
// ============================================

export interface PlanFeatures {
  maxProjects: number;
  maxTeamMembers: number;
  profileBoost: boolean;
  advancedAnalytics: boolean;
  earlyDealAccess: boolean;
  prioritySupport: boolean;
  maxAlliances: number;
  canSendMessage: boolean;
  canViewProfiles: boolean;
  canCreateStartups: boolean;
  canApplyToJobs: boolean;
  canAccessDealFlow: boolean;
}

/**
 * Founder plan features - only founders have subscription plans
 */
export const FOUNDER_PLAN_FEATURES: Record<FounderPlanType, PlanFeatures> = {
  free_founder: {
    maxProjects: 1,
    maxTeamMembers: 5,
    profileBoost: false,
    advancedAnalytics: false,
    earlyDealAccess: false,
    prioritySupport: false,
    maxAlliances: 10,
    canSendMessage: true,
    canViewProfiles: true,
    canCreateStartups: true,
    canApplyToJobs: true,
    canAccessDealFlow: false,
  },
  pro_founder: {
    maxProjects: 5,
    maxTeamMembers: 15,
    profileBoost: true,
    advancedAnalytics: true,
    earlyDealAccess: false,
    prioritySupport: false,
    maxAlliances: 50,
    canSendMessage: true,
    canViewProfiles: true,
    canCreateStartups: true,
    canApplyToJobs: true,
    canAccessDealFlow: true,
  },
  scale_founder: {
    maxProjects: 20,
    maxTeamMembers: 50,
    profileBoost: true,
    advancedAnalytics: true,
    earlyDealAccess: true,
    prioritySupport: true,
    maxAlliances: 200,
    canSendMessage: true,
    canViewProfiles: true,
    canCreateStartups: true,
    canApplyToJobs: true,
    canAccessDealFlow: true,
  },
  enterprise_founder: {
    maxProjects: -1, // Unlimited
    maxTeamMembers: -1, // Unlimited
    profileBoost: true,
    advancedAnalytics: true,
    earlyDealAccess: true,
    prioritySupport: true,
    maxAlliances: -1, // Unlimited
    canSendMessage: true,
    canViewProfiles: true,
    canCreateStartups: true,
    canApplyToJobs: true,
    canAccessDealFlow: true,
  },
};

// Legacy support - map old plan names to new founder plans
const LEGACY_PLAN_MAPPING: Record<string, FounderPlanType> = {
  free: 'free_founder',
  pro: 'pro_founder',
  scale: 'scale_founder',
  premium: 'enterprise_founder',
};

// PLAN_FEATURES for backward compatibility
export const PLAN_FEATURES = FOUNDER_PLAN_FEATURES;

// ============================================
// PLAN PRICING (Founder Only)
// ============================================

export const PLAN_PRICES: Record<FounderPlanType, { monthly: number; yearly: number }> = {
  free_founder: { monthly: 0, yearly: 0 },
  pro_founder: { monthly: 29, yearly: 290 },
  scale_founder: { monthly: 99, yearly: 990 },
  enterprise_founder: { monthly: 299, yearly: 2990 },
};

// ============================================
// ROLE-PLAN VALIDATION
// ============================================

/**
 * Check if a role requires a subscription
 * Only founders require subscriptions
 */
export function roleRequiresSubscription(role: UserRole): boolean {
  return role === 'founder';
}

/**
 * Check if a role can access billing
 * Only founders can access billing
 */
export function roleCanAccessBilling(role: UserRole): boolean {
  return role === 'founder';
}

/**
 * Valid role-plan combinations
 * Only founders can have paid plans
 */
export function isValidRolePlan(role: string, plan: string): boolean {
  // Only founders can have subscription plans
  if (role === 'founder') {
    const founderPlans: FounderPlanType[] = ['free_founder', 'pro_founder', 'scale_founder', 'enterprise_founder'];
    // Also accept legacy plan names for backward compatibility
    const legacyPlans = ['free', 'pro', 'scale', 'premium'];
    return founderPlans.includes(plan as FounderPlanType) || legacyPlans.includes(plan);
  }
  
  // Non-founders don't have subscription plans
  // They get full access to their role-appropriate features for free
  return plan === 'free' || plan === `${role}_free`;
}

// ============================================
// FEATURE ACCESS FUNCTIONS
// ============================================

/**
 * Get plan features for a founder
 */
export function getPlanFeatures(plan: PlanType): PlanFeatures {
  // Map legacy plan names to new founder plans
  const founderPlan = LEGACY_PLAN_MAPPING[plan] || plan;
  
  if (founderPlan in FOUNDER_PLAN_FEATURES) {
    return FOUNDER_PLAN_FEATURES[founderPlan as FounderPlanType];
  }
  
  // Default to free_founder
  return FOUNDER_PLAN_FEATURES.free_founder;
}

/**
 * Check if a feature is available for a role/plan combination
 */
export function hasFeature(role: UserRole, plan: PlanType | null, feature: FeatureKey): boolean {
  // Non-founders get full access to role-appropriate features
  if (role !== 'founder') {
    // Talent and Investor features are always available (free)
    const freeFeatures: FeatureKey[] = [
      'canSendMessage',
      'canViewProfiles',
      'canApplyToJobs', // Talent
      'canAccessDealFlow', // Investor
    ];
    
    // All role-appropriate features are free for non-founders
    return true;
  }
  
  // Founders: check plan features
  const features = getPlanFeatures(plan || 'free_founder');
  const value = features[feature];
  
  // For numeric features, -1 means unlimited
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return Boolean(value);
}

/**
 * Check if a limit is exceeded (Founder only)
 */
export function isLimitExceeded(
  role: UserRole,
  plan: PlanType | null,
  feature: 'maxProjects' | 'maxTeamMembers' | 'maxAlliances',
  currentCount: number
): boolean {
  // Non-founders have no limits
  if (role !== 'founder') {
    return false;
  }
  
  const features = getPlanFeatures(plan || 'free_founder');
  const limit = features[feature];
  
  // -1 means unlimited
  if (limit === -1) return false;
  
  return currentCount >= limit;
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: PlanType | null, role?: UserRole): string {
  // For non-founders, show "Free" 
  if (role && role !== 'founder') {
    return 'Free';
  }
  
  if (!plan) return 'Free';
  
  const names: Record<string, string> = {
    free_founder: 'Free',
    pro_founder: 'Pro',
    scale_founder: 'Scale',
    enterprise_founder: 'Enterprise',
    // Legacy names
    free: 'Free',
    pro: 'Pro',
    scale: 'Scale',
    premium: 'Enterprise',
  };
  
  return names[plan] || 'Free';
}

/**
 * Get the appropriate plan for a user based on role
 */
export function getDefaultPlanForRole(role: UserRole): PlanType {
  if (role === 'founder') {
    return 'free_founder';
  }
  // Non-founders don't need a subscription
  return 'free';
}
