/**
 * Redis Cache Implementation
 * Production-ready Redis caching with Upstash REST and optional ioredis support.
 * Uses SCAN instead of KEYS for production safety.
 */

import { CacheInterface, CacheStats, CACHE_TTL, MemoryCache } from './cache';
import { createLogger } from './logger';

const log = createLogger('redis-cache');

// ============================================
// REDIS CLIENT INTERFACE
// ============================================

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<'OK' | null>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string, options: { match: string; count: number }): Promise<[string, string[]]>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  dbsize(): Promise<number>;
  info(section?: string): Promise<string>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  pipeline?(): RedisPipeline;
}

interface RedisPipeline {
  set(key: string, value: string, options?: { ex?: number }): RedisPipeline;
  del(key: string): RedisPipeline;
  exec(): Promise<unknown[]>;
}

// ============================================
// UPSTASH REDIS CLIENT (REST-based, serverless-safe)
// ============================================

class UpstashRedisClient implements RedisClient {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  private async fetch<T>(command: string[]): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result as T;
  }

  async get(key: string): Promise<string | null> {
    return this.fetch<string | null>(['GET', key]);
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<'OK' | null> {
    const command = options?.ex
      ? ['SET', key, value, 'EX', String(options.ex)]
      : ['SET', key, value];
    return this.fetch<'OK' | null>(command);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.fetch<number>(['DEL', ...keys]);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.fetch<string[]>(['KEYS', pattern]);
  }

  async scan(cursor: string, options: { match: string; count: number }): Promise<[string, string[]]> {
    return this.fetch<[string, string[]]>(['SCAN', cursor, 'MATCH', options.match, 'COUNT', String(options.count)]);
  }

  async incr(key: string): Promise<number> {
    return this.fetch<number>(['INCR', key]);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.fetch<number>(['EXPIRE', key, String(seconds)]);
  }

  async ttl(key: string): Promise<number> {
    return this.fetch<number>(['TTL', key]);
  }

  async dbsize(): Promise<number> {
    return this.fetch<number>(['DBSIZE']);
  }

  async info(section?: string): Promise<string> {
    return this.fetch<string>(section ? ['INFO', section] : ['INFO']);
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.fetch<(string | null)[]>(['MGET', ...keys]);
  }
}

// ============================================
// PRODUCTION REDIS CACHE
// ============================================

export class ProductionRedisCache implements CacheInterface {
  private client: RedisClient;
  private prefix: string;
  private hits = 0;
  private misses = 0;
  private connected = false;

  constructor(client: RedisClient, prefix = 'AS:') {
    this.client = client;
    this.prefix = prefix;
    this.connected = true;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.client.get(fullKey);

      if (value === null) {
        this.misses++;
        return null;
      }

      this.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      log.debug('Redis get error', { key, error: String(error) });
      this.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      if (value === undefined) return;
      const fullKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      await this.client.set(fullKey, serialized, { ex: ttl });
    } catch (error) {
      log.debug('Redis set error', { key, error: String(error) });
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const result = await this.client.del(fullKey);
      return result > 0;
    } catch (error) {
      log.debug('Redis delete error', { key, error: String(error) });
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      // Use SCAN instead of KEYS for production safety (non-blocking)
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, {
          match: `${this.prefix}*`,
          count: 100,
        });
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');

      this.hits = 0;
      this.misses = 0;
    } catch (error) {
      log.error('Redis clear error', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.client.get(fullKey);
      return value !== null;
    } catch (error) {
      log.debug('Redis has error', { key, error: String(error) });
      return false;
    }
  }

  /**
   * Pattern-based invalidation using SCAN (production-safe, non-blocking).
   * Pattern is auto-prefixed with the cache namespace.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(cursor, {
          match: `${this.prefix}${pattern}*`,
          count: 100,
        });
        cursor = nextCursor;
        if (keys.length > 0) {
          const deleted = await this.client.del(...keys);
          totalDeleted += deleted;
        }
      } while (cursor !== '0');

      return totalDeleted;
    } catch (error) {
      log.error('Redis invalidatePattern error', error);
      return 0;
    }
  }

  /**
   * Cache-aside: get existing value, or compute and cache it.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = CACHE_TTL.MEDIUM): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * Batch get multiple keys at once (reduces round-trips).
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(k => this.getKey(k));
      const values = await this.client.mget(...fullKeys);
      return values.map(v => {
        if (v === null) {
          this.misses++;
          return null;
        }
        this.hits++;
        try {
          return JSON.parse(v) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      log.debug('Redis mget error', { error: String(error) });
      return keys.map(() => null);
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0.0';
    log.debug(`Cache stats: ${this.hits} hits, ${this.misses} misses, ${hitRate}% hit rate`);

    return {
      hits: this.hits,
      misses: this.misses,
      keys: -1, // Would need DBSIZE call
      memoryUsage: -1,
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.client.set('__health__', 'ok', { ex: 10 });
      const value = await this.client.get('__health__');

      if (value === 'ok') {
        await this.client.del('__health__');
        return { status: 'up', latency: Date.now() - start };
      }

      return { status: 'down', error: 'Health check value mismatch' };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================
// CACHE FACTORY
// ============================================

let cacheInstance: CacheInterface | null = null;

export function initializeRedisCache(): CacheInterface {
  if (cacheInstance) return cacheInstance;

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl) {
    log.info('No Redis URL configured, using in-memory cache');
    cacheInstance = new MemoryCache();
    return cacheInstance;
  }

  if (redisUrl.includes('upstash') && redisToken) {
    log.info('Initializing Upstash Redis cache');
    const client = new UpstashRedisClient(redisUrl, redisToken);
    cacheInstance = new ProductionRedisCache(client);
    return cacheInstance;
  }

  // For other Redis providers (ioredis), fall back to memory cache
  // To use ioredis, install it and create a client adapter here
  log.warn('Redis URL set but provider not fully configured, using in-memory cache');
  cacheInstance = new MemoryCache();
  return cacheInstance;
}

export function getCache(): CacheInterface {
  if (!cacheInstance) {
    cacheInstance = initializeRedisCache();
  }
  return cacheInstance;
}

// ============================================
// RATE LIMITER WITH REDIS
// ============================================

export class RedisRateLimiter {
  private client: RedisClient;
  private prefix: string;

  constructor(client: RedisClient, prefix = 'ratelimit:') {
    this.client = client;
    this.prefix = prefix;
  }

  async checkLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const fullKey = `${this.prefix}${key}`;
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const windowKey = `${fullKey}:${window}`;

    try {
      const count = await this.client.incr(windowKey);

      if (count === 1) {
        await this.client.expire(windowKey, Math.ceil(windowMs / 1000));
      }

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetTime: (window + 1) * windowMs,
      };
    } catch (error) {
      log.debug('Rate limiter error', { error: String(error) });
      return { allowed: true, remaining: limit, resetTime: now + windowMs };
    }
  }
}

export function createRedisRateLimiter(): RedisRateLimiter | null {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  if (redisUrl.includes('upstash')) {
    const client = new UpstashRedisClient(redisUrl, redisToken);
    return new RedisRateLimiter(client);
  }

  return null;
}
