import { CacheConfig, CacheInfo, CacheManager } from '@/interfaces/cache.interface';

/**
 * Implementação de cache em memória
 * Segue o padrão black box - esconde detalhes de implementação
 */
export class MemoryCache implements CacheManager {
  private cache = new Map<string, { value: any; expiresAt?: number }>();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return;

    const expiresAt = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.cache.set(key, { value, ...(expiresAt && { expiresAt }) });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deleteMany(keys: string[]): Promise<void> {
    keys.forEach(key => this.cache.delete(key));
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      item.expiresAt = Date.now() + (ttl * 1000);
    }
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    if (!item || !item.expiresAt) return -1;

    const remaining = Math.floor((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }

  async increment(key: string, value = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + value;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, value = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current - value;
    await this.set(key, newValue);
    return newValue;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    
    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }

    return result;
  }

  async setMany<T>(data: Record<string, T>, ttl?: number): Promise<void> {
    const promises = Object.entries(data).map(([key, value]) => 
      this.set(key, value, ttl)
    );
    await Promise.all(promises);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async info(): Promise<CacheInfo> {
    const now = Date.now();
    let totalKeys = 0;
    let expiredKeys = 0;

    for (const [_, item] of this.cache) {
      totalKeys++;
      if (item.expiresAt && now > item.expiresAt) {
        expiredKeys++;
      }
    }

    return {
      type: 'memory',
      version: '1.0.0',
      uptime: process.uptime(),
      connectedClients: 1,
      usedMemory: `${this.cache.size} items`,
      totalKeys: totalKeys - expiredKeys,
      hitRate: 0, // Not implemented for simplicity
    };
  }
}
