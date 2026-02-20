/**
 * Caching Utility with Redis-ready abstraction
 * Provides in-memory caching for development with interface for Redis in production
 */

// ============================================
// TYPES
// ============================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryUsage: number;
}

export interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): CacheStats;
}

// ============================================
// IN-MEMORY CACHE (Development)
// ============================================

export class MemoryCache implements CacheInterface {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  async set<T>(key: string, value: T, ttl = 300): Promise<void> {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  getStats(): CacheStats {
    let memoryUsage = 0;
    this.cache.forEach((value, key) => {
      memoryUsage += key.length * 2; // Rough estimate
      memoryUsage += JSON.stringify(value).length * 2;
    });

    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.cache.size,
      memoryUsage,
    };
  }
}

// ============================================
// REDIS CACHE STUB (Production)
// ============================================

class RedisCache implements CacheInterface {
  // This would be implemented with actual Redis client
  // For now, falls back to memory cache
  private fallback = new MemoryCache();

  async get<T>(key: string): Promise<T | null> {
    // TODO: Implement with Redis client
    return this.fallback.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl = 300): Promise<void> {
    // TODO: Implement with Redis client
    return this.fallback.set<T>(key, value, ttl);
  }

  async delete(key: string): Promise<boolean> {
    return this.fallback.delete(key);
  }

  async clear(): Promise<void> {
    return this.fallback.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.fallback.has(key);
  }

  getStats(): CacheStats {
    return this.fallback.getStats();
  }
}

// ============================================
// CACHE INSTANCE
// ============================================

// Use memory cache in development, Redis in production
const shouldUseRedis = process.env.NODE_ENV === 'production' && process.env.REDIS_URL;

export const cache: CacheInterface = shouldUseRedis
  ? new RedisCache()
  : new MemoryCache();

// ============================================
// CACHE KEYS
// ============================================

export const CACHE_KEYS = {
  // Public profiles
  userProfile: (userId: string) => `user:profile:${userId}`,

  // Startups
  startupList: (filters: string) => `startups:list:${filters}`,
  startupDetail: (startupId: string) => `startups:detail:${startupId}`,

  // Trust scores
  trustScore: (userId: string) => `trust:score:${userId}`,
  trustLog: (userId: string) => `trust:log:${userId}`,

  // Dashboard metrics
  dashboardStats: (userId: string, role: string) => `dashboard:stats:${role}:${userId}`,

  // Subscriptions
  subscriptionFeatures: (plan: string) => `subscription:features:${plan}`,
  userSubscription: (userId: string) => `subscription:user:${userId}`,

  // Search results
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
} as const;

// ============================================
// CACHE TTL VALUES (in seconds)
// ============================================

export const CACHE_TTL = {
  SHORT: 60,          // 1 minute - for frequently changing data
  MEDIUM: 300,        // 5 minutes - for moderately changing data
  LONG: 900,          // 15 minutes - for semi-static data
  VERY_LONG: 3600,    // 1 hour - for static data
  DAY: 86400,         // 1 day - for rarely changing data
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get or set cache with automatic fetch
 */
export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL.MEDIUM
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  await cache.set(key, data, ttl);
  return data;
}

/**
 * Invalidate cache by pattern prefix
 */
export async function invalidateCachePattern(prefix: string): Promise<void> {
  // For memory cache, we can iterate and delete
  // For Redis, we'd use SCAN with DEL
  if (cache instanceof MemoryCache) {
    const stats = cache.getStats();
    // Note: This is a simplified implementation
    // In production with Redis, you'd use pattern matching
    console.log(`Would invalidate keys matching: ${prefix}*`);
  }
}

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.userProfile(userId));
  await cache.delete(CACHE_KEYS.trustScore(userId));
  await cache.delete(CACHE_KEYS.dashboardStats(userId, 'founder'));
  await cache.delete(CACHE_KEYS.dashboardStats(userId, 'talent'));
  await cache.delete(CACHE_KEYS.dashboardStats(userId, 'investor'));
  await cache.delete(CACHE_KEYS.userSubscription(userId));
}

/**
 * Invalidate startup-related caches
 */
export async function invalidateStartupCache(startupId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.startupDetail(startupId));
  // Clear list caches (simplified - in production would use pattern matching)
}
