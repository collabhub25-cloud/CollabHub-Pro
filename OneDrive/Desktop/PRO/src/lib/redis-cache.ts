/**
 * Redis Cache Implementation
 * Production-ready Redis caching with Upstash/Redis support
 */

import { CacheInterface, CacheStats, CACHE_TTL, MemoryCache } from './cache';

// ============================================
// REDIS CLIENT INTERFACE
// ============================================

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  dbsize(): Promise<number>;
  info(section?: string): Promise<string>;
}

// ============================================
// UPSTASH REDIS CLIENT
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

  async del(key: string): Promise<number> {
    return this.fetch<number>(['DEL', key]);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.fetch<string[]>(['KEYS', pattern]);
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

  constructor(client: RedisClient, prefix = 'collabhub:') {
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
      console.error('Redis get error:', error);
      this.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      await this.client.set(fullKey, serialized, { ex: ttl });
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const result = await this.client.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        // Delete in batches of 100 to avoid blocking
        for (let i = 0; i < keys.length; i += 100) {
          const batch = keys.slice(i, i + 100);
          await Promise.all(batch.map(key => this.client.del(key)));
        }
      }
      this.hits = 0;
      this.misses = 0;
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.client.get(fullKey);
      return value !== null;
    } catch (error) {
      console.error('Redis has error:', error);
      return false;
    }
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      keys: -1, // Would need DBSIZE call
      memoryUsage: -1, // Would need INFO memory call
    };
  }

  // Additional production methods
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl = CACHE_TTL.MEDIUM): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(`${this.prefix}${pattern}*`);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.client.del(key)));
      }
      return keys.length;
    } catch (error) {
      console.error('Redis invalidatePattern error:', error);
      return 0;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.client.set('__health_check__', 'ok', { ex: 10 });
      const value = await this.client.get('__health_check__');
      
      if (value === 'ok') {
        await this.client.del('__health_check__');
        return { status: 'up', latency: Date.now() - start };
      }
      
      return { status: 'down', error: 'Health check failed' };
    } catch (error) {
      return { 
        status: 'down', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// ============================================
// CACHE FACTORY
// ============================================

let cacheInstance: CacheInterface | null = null;

export function initializeRedisCache(): CacheInterface {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl) {
    console.warn('⚠️ No Redis URL configured, falling back to memory cache');
    return new MemoryCache();
  }

  console.log('✅ Initializing Redis cache...');

  if (redisUrl.includes('upstash') && redisToken) {
    // Upstash Redis
    const client = new UpstashRedisClient(redisUrl, redisToken);
    return new ProductionRedisCache(client);
  }

  // For other Redis providers, would need ioredis or similar
  // For now, fall back to memory cache
  console.warn('⚠️ Redis provider not fully configured, falling back to memory cache');
  return new MemoryCache();
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
      
      // Set expiry on first request in window
      if (count === 1) {
        await this.client.expire(windowKey, Math.ceil(windowMs / 1000));
      }

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetTime: (window + 1) * windowMs,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Allow on error (fail open)
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
