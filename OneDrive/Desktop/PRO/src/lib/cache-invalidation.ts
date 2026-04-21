/**
 * Cache Invalidation Service
 * Centralized, mutation-driven cache invalidation.
 * Call these functions after any data mutation to keep caches consistent.
 */

import { getCache, CACHE_KEYS, invalidateCachePattern } from './cache';
import { createLogger } from './logger';

const log = createLogger('cache-invalidation');

// ============================================
// USER MUTATIONS
// ============================================

/**
 * Call after: profile update, settings change, verification level change
 */
export async function onProfileUpdate(userId: string): Promise<void> {
  const cache = getCache();
  const deleteOps = [
    cache.delete(CACHE_KEYS.userProfile(userId)),
    cache.delete(CACHE_KEYS.trustScore(userId)),
    cache.delete(CACHE_KEYS.userSubscription(userId)),
    // Invalidate all dashboard views for this user
    cache.delete(CACHE_KEYS.dashboardStats(userId, 'founder')),
    cache.delete(CACHE_KEYS.dashboardStats(userId, 'talent')),
    cache.delete(CACHE_KEYS.dashboardStats(userId, 'investor')),
    // Invalidate AI recommendations that referenced this user
    invalidateCachePattern(`match:jobs:${userId}`),
    invalidateCachePattern(`match:investors:${userId}`),
    invalidateCachePattern(`match:startups:${userId}`),
  ];
  await Promise.allSettled(deleteOps);
  log.debug(`Cache invalidated for user ${userId}`);
}

// ============================================
// STARTUP MUTATIONS
// ============================================

/**
 * Call after: startup create, edit, or delete
 */
export async function onStartupEdit(startupId: string, founderId: string): Promise<void> {
  const cache = getCache();
  log.debug(`Invalidating caches: startup=${startupId}, founder=${founderId}`);
  const deleteOps = [
    cache.delete(CACHE_KEYS.startupDetail(startupId)),
    cache.delete(CACHE_KEYS.startupsByFounder(founderId)),
    // Invalidate user-scoped listing caches (all filter variants for this user)
    invalidateCachePattern(`startups:list:${founderId}:`),
    // Also invalidate global listing caches used by discover/search
    invalidateCachePattern('startups:list:__global__:'),
    // Invalidate AI recommendations that reference this startup
    cache.delete(CACHE_KEYS.recommendedTalents(startupId)),
    // Founder's dashboard data is stale
    cache.delete(CACHE_KEYS.dashboardStats(founderId, 'founder')),
  ];
  const results = await Promise.allSettled(deleteOps);
  const fulfilled = results.filter(r => r.status === 'fulfilled').length;
  log.debug(`Cache invalidation complete for startup ${startupId}: ${fulfilled}/${results.length} keys cleared`);
}

// ============================================
// JOB MUTATIONS
// ============================================

/**
 * Call after: job create, edit, delete, or close
 */
export async function onJobChange(startupId: string, founderId: string): Promise<void> {
  const cache = getCache();
  const deleteOps = [
    // Talent-facing AI recommendations are stale
    invalidateCachePattern('match:jobs:'),
    // Founder's startup talent recommendations are stale
    cache.delete(CACHE_KEYS.recommendedTalents(startupId)),
    // Founder dashboard stats (active jobs count)
    cache.delete(CACHE_KEYS.dashboardStats(founderId, 'founder')),
  ];
  await Promise.allSettled(deleteOps);
  log.debug(`Cache invalidated for jobs in startup ${startupId}`);
}

// ============================================
// APPLICATION MUTATIONS
// ============================================

/**
 * Call after: application submit, accept, reject
 */
export async function onApplicationChange(startupId: string, talentId: string, founderId: string): Promise<void> {
  const cache = getCache();
  const deleteOps = [
    cache.delete(CACHE_KEYS.dashboardStats(founderId, 'founder')),
    cache.delete(CACHE_KEYS.dashboardStats(talentId, 'talent')),
  ];
  await Promise.allSettled(deleteOps);
  log.debug(`Cache invalidated for application: startup=${startupId} talent=${talentId}`);
}

// ============================================
// AI MATCH MUTATIONS
// ============================================

/**
 * Call when AI matching results are freshly computed — cache them.
 */
export async function onMatchComputed(
  cacheKey: string,
  results: unknown,
  ttlSeconds: number = 900  // 15 min default
): Promise<void> {
  const cache = getCache();
  await cache.set(cacheKey, results, ttlSeconds);
  log.debug(`Cached match results: ${cacheKey}`);
}

// ============================================
// INVESTMENT / PITCH MUTATIONS
// ============================================

/**
 * Call after: pitch create, send, reject, invest
 */
export async function onPitchChange(startupId: string, founderId: string, investorId: string): Promise<void> {
  const cache = getCache();
  const deleteOps = [
    cache.delete(CACHE_KEYS.dashboardStats(founderId, 'founder')),
    cache.delete(CACHE_KEYS.dashboardStats(investorId, 'investor')),
    cache.delete(CACHE_KEYS.recommendedStartups(investorId)),
    cache.delete(CACHE_KEYS.recommendedInvestors(founderId)),
  ];
  await Promise.allSettled(deleteOps);
  log.debug(`Cache invalidated for pitch: startup=${startupId}`);
}

// ============================================
// NOTIFICATION MUTATIONS
// ============================================

/**
 * Call after: new notification created
 */
export async function onNotificationChange(userId: string): Promise<void> {
  const cache = getCache();
  // Dashboard data includes notification count
  await cache.delete(CACHE_KEYS.dashboardStats(userId, 'founder'));
  await cache.delete(CACHE_KEYS.dashboardStats(userId, 'talent'));
  await cache.delete(CACHE_KEYS.dashboardStats(userId, 'investor'));
}

// ============================================
// BULK INVALIDATION
// ============================================

/**
 * Nuclear option: clear all caches. Use sparingly.
 */
export async function invalidateAll(): Promise<void> {
  const cache = getCache();
  await cache.clear();
  log.warn('All caches cleared');
}
