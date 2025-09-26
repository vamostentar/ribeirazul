import { config } from '@/utils/config';
import { logger } from '@/utils/logger';
import { Redis } from 'ioredis';
import NodeCache from 'node-cache';

export class CacheService {
  private redisClient?: Redis;
  private nodeCache: NodeCache;

  constructor(redis?: Redis) {
    this.redisClient = redis;
    this.nodeCache = new NodeCache({
      stdTTL: config.CACHE_TTL,
      maxKeys: config.CACHE_MAX_SIZE,
      useClones: false,
    });

    logger.info('Cache service initialized', {
      redisAvailable: !!this.redisClient,
      nodeCacheTTL: config.CACHE_TTL,
      maxKeys: config.CACHE_MAX_SIZE,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
      }

      // Fallback to NodeCache
      const value = this.nodeCache.get<T>(key);
      return value || null;
    } catch (error: any) {
      logger.error('Cache get error', {
        error: error.message,
        key,
      });
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const cacheTTL = ttl || config.CACHE_TTL;

      // Set in Redis if available
      if (this.redisClient) {
        await this.redisClient.setex(key, cacheTTL, serializedValue);
      }

      // Set in NodeCache as backup
      this.nodeCache.set(key, value, cacheTTL);

      return true;
    } catch (error: any) {
      logger.error('Cache set error', {
        error: error.message,
        key,
        ttl,
      });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;

      // Delete from Redis if available
      if (this.redisClient) {
        const result = await this.redisClient.del(key);
        deleted = result > 0;
      }

      // Delete from NodeCache
      const nodeDeleted = this.nodeCache.del(key) > 0;

      return deleted || nodeDeleted;
    } catch (error: any) {
      logger.error('Cache delete error', {
        error: error.message,
        key,
      });
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      // Clear Redis if available
      if (this.redisClient) {
        await this.redisClient.flushdb();
      }

      // Clear NodeCache
      this.nodeCache.flushAll();

      logger.info('Cache cleared');
      return true;
    } catch (error: any) {
      logger.error('Cache clear error', {
        error: error.message,
      });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      // Check Redis first if available
      if (this.redisClient) {
        const exists = await this.redisClient.exists(key);
        if (exists) return true;
      }

      // Check NodeCache
      return this.nodeCache.has(key);
    } catch (error: any) {
      logger.error('Cache exists error', {
        error: error.message,
        key,
      });
      return false;
    }
  }

  async getStats(): Promise<{
    redis?: {
      connected: boolean;
      memory: string;
      keys: number;
    };
    nodeCache: {
      keys: number;
      hits: number;
      misses: number;
      ksize: number;
      vsize: number;
    };
  }> {
    const stats: any = {
      nodeCache: this.nodeCache.getStats(),
    };

    if (this.redisClient) {
      try {
        const info = await this.redisClient.info('memory');
        const dbsize = await this.redisClient.dbsize();
        
        stats.redis = {
          connected: this.redisClient.status === 'ready',
          memory: info.split('\r\n').find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown',
          keys: dbsize,
        };
      } catch (error: any) {
        stats.redis = {
          connected: false,
          memory: 'error',
          keys: 0,
        };
      }
    }

    return stats;
  }
}
