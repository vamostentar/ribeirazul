import { CacheConfig, CacheManager, CacheStats, TaggedCacheManager } from '@/interfaces/cache.interface';

/**
 * Implementação da interface CacheManager usando memória
 * Pode ser facilmente substituída por Redis ou outras implementações
 */
export class MemoryCache implements CacheManager {
  private cache = new Map<string, { value: any; expiry?: number }>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(private config: CacheConfig) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expiry && entry.expiry < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.cache.set(key, { value, expiry });
    this.stats.sets++;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiry && entry.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async deletePattern(pattern: string): Promise<number> {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
        this.stats.deletes++;
      }
    }

    return count;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.deletes += this.cache.size;
  }

  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<void> {
    await Promise.all(
      Object.entries(entries).map(([key, value]) => this.set(key, value, ttl))
    );
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + amount;
    await this.set(key, newValue);
    return newValue;
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiry = Date.now() + (ttl * 1000);
    return true;
  }

  async getTtl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry || !entry.expiry) return -1;

    const remaining = Math.floor((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }

  getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return Promise.resolve({
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      keys: this.cache.size,
      memoryUsage: this.calculateMemoryUsage(),
      uptime: process.uptime(),
    });
  }

  /**
   * Limpa entradas expiradas do cache
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && entry.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Calcula uso aproximado de memória
   */
  private calculateMemoryUsage(): number {
    // Rough estimation: each entry uses ~100 bytes for key + value + metadata
    return this.cache.size * 100;
  }
}

/**
 * Implementação da interface TaggedCacheManager usando memória
 */
export class MemoryTaggedCache extends MemoryCache implements TaggedCacheManager {
  private tags = new Map<string, Set<string>>();

  async setWithTags<T>(key: string, value: T, tags: string[], ttl?: number): Promise<void> {
    await this.set(key, value, ttl);

    // Associate tags with the key
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }
  }

  async deleteByTag(tag: string): Promise<number> {
    const keys = this.tags.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        count++;
      }
    }

    this.tags.delete(tag);
    return count;
  }

  async deleteByTags(tags: string[]): Promise<number> {
    let totalCount = 0;
    for (const tag of tags) {
      totalCount += await this.deleteByTag(tag);
    }
    return totalCount;
  }

  async getTags(key: string): Promise<string[]> {
    const result: string[] = [];
    for (const [tag, keys] of this.tags.entries()) {
      if (keys.has(key)) {
        result.push(tag);
      }
    }
    return result;
  }

  override async clear(): Promise<void> {
    await super.clear();
    this.tags.clear();
  }
}
