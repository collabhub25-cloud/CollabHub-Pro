/**
 * Unified Caching Layer
 * Production-ready cache with Redis + memory fallback.
 * All cache access MUST go through the exported `cache` singleton.
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
  /** Delete all keys matching a prefix pattern */
  invalidatePattern(pattern: string): Promise<number>;
  /** Get-or-set with auto-fetch */
  getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>;
}

// ============================================
// TTL PRESETS (seconds)
// ============================================

export const CACHE_TTL = {
  /** 30 seconds — dashboard aggregated data */
  DASHBOARD: 30,
  /** 60 seconds — frequently changing data */
  SHORT: 60,
  /** 300 seconds (5 min) — startup listings */
  MEDIUM: 300,
  /** 900 seconds (15 min) — AI matching results */
  LONG: 900,
  /** 3600 seconds (1 hour) — static reference data */
  VERY_LONG: 3600,
  /** 86400 seconds (1 day) — rarely changing data */
  DAY: 86400,
} as const;

// ============================================
// STRUCTURED CACHE KEYS
// ============================================

export const CACHE_KEYS = {
  // User profiles (invalidate on update)
  userProfile: (userId: string) => `user:${userId}`,

  // Startups (TTL: 5 min)
  startupDetail: (startupId: string) => `startup:${startupId}`,
  startupList: (userId: string, filters: string) => `startups:list:${userId}:${filters}`,
  startupsByFounder: (founderId: string) => `startups:founder:${founderId}`,

  // AI matching results (TTL: 15 min)
  matchResult: (userId: string, startupId: string) => `match:${userId}:${startupId}`,
  recommendedJobs: (talentId: string) => `match:jobs:${talentId}`,
  recommendedStartups: (investorId: string) => `match:startups:${investorId}`,
  recommendedTalents: (startupId: string) => `match:talents:${startupId}`,
  recommendedInvestors: (founderId: string) => `match:investors:${founderId}`,

  // Dashboard aggregated data (TTL: 30-60 sec)
  dashboardStats: (userId: string, role: string) => `dashboard:${role}:${userId}`,

  // Trust scores
  trustScore: (userId: string) => `trust:score:${userId}`,

  // Subscriptions
  subscriptionFeatures: (plan: string) => `subscription:features:${plan}`,
  userSubscription: (userId: string) => `subscription:user:${userId}`,

  // Search results
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
} as const;

// ============================================
// IN-MEMORY CACHE (Development / Fallback)
// ============================================

export class MemoryCache implements CacheInterface {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

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

  async set<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

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

    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = CACHE_TTL.MEDIUM): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  getStats(): CacheStats {
    let memoryUsage = 0;
    this.cache.forEach((value, key) => {
      memoryUsage += key.length * 2;
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
// CACHE SINGLETON
// ============================================

let cacheInstance: CacheInterface | null = null;

/**
 * Get the global cache instance.
 * In production with Redis configured, uses ProductionRedisCache.
 * Otherwise falls back to MemoryCache.
 */
export function getCache(): CacheInterface {
  if (!cacheInstance) {
    // Lazy import to avoid circular dependency issues
    try {
      const { initializeRedisCache } = require('./redis-cache');
      cacheInstance = initializeRedisCache();
    } catch {
      cacheInstance = new MemoryCache();
    }
  }
  return cacheInstance as CacheInterface;
}

/** Direct reference for convenience (lazy-init on first access) */
export const cache: CacheInterface = new Proxy({} as CacheInterface, {
  get(_target, prop) {
    const instance = getCache();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Cache-aside pattern: get from cache, or fetch and cache the result.
 */
export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  return getCache().getOrSet(key, fetcher, ttl);
}

/**
 * Invalidate all cache keys matching a prefix.
 */
export async function invalidateCachePattern(prefix: string): Promise<number> {
  return getCache().invalidatePattern(prefix);
}

/**
 * Invalidate all user-related caches.
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const c = getCache();
  await Promise.all([
    c.delete(CACHE_KEYS.userProfile(userId)),
    c.delete(CACHE_KEYS.trustScore(userId)),
    c.delete(CACHE_KEYS.userSubscription(userId)),
    c.invalidatePattern(`dashboard:`).catch(() => {}),
  ]);
}

/**
 * Invalidate all startup-related caches.
 */
export async function invalidateStartupCache(startupId: string, founderId?: string): Promise<void> {
  const c = getCache();
  const ops: Promise<unknown>[] = [
    c.delete(CACHE_KEYS.startupDetail(startupId)),
  ];
  if (founderId) {
    // User-scoped: only invalidate this founder's caches
    ops.push(c.invalidatePattern(`startups:list:${founderId}:`));
    ops.push(c.delete(CACHE_KEYS.startupsByFounder(founderId)));
  } else {
    // Fallback: broad invalidation
    ops.push(c.invalidatePattern('startups:list:'));
    ops.push(c.invalidatePattern('startups:founder:'));
  }
  await Promise.all(ops);
}
