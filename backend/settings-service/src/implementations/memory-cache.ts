import { CacheManager } from '@/interfaces/cache.interface';
import { SystemSettings } from '@/types/settings';

interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize?: number;
  strategy?: 'lru' | 'fifo' | 'ttl';
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Implementação de cache em memória
 * Usa LRU (Least Recently Used) como estratégia padrão
 */
export class MemoryCache implements CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(private config: CacheConfig) {}

  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const actualTtl = ttl || this.config.ttl;
    const expiresAt = Date.now() + (actualTtl * 1000);

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Verificar limite de tamanho
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      this.evictEntry();
    }

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  async getSettings(): Promise<SystemSettings | null> {
    return this.get<SystemSettings>('settings:main');
  }

  async setSettings(settings: SystemSettings, ttl?: number): Promise<void> {
    await this.set('settings:main', settings, ttl);
  }

  async invalidateSettings(): Promise<void> {
    await this.delete('settings:main');
  }

  async getModuleSettings(moduleName: string): Promise<Record<string, any> | null> {
    return this.get<Record<string, any>>(`module:${moduleName}`);
  }

  async setModuleSettings(moduleName: string, settings: Record<string, any>, ttl?: number): Promise<void> {
    await this.set(`module:${moduleName}`, settings, ttl);
  }

  async invalidateModuleSettings(moduleName: string): Promise<void> {
    await this.delete(`module:${moduleName}`);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async getTTL(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -1;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return -1;
    }
    
    return Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000));
  }

  async extendTTL(key: string, ttl: number): Promise<void> {
    const entry = this.cache.get(key);
    if (!entry) return;
    
    entry.expiresAt = Date.now() + (ttl * 1000);
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Teste básico de funcionamento
      const testKey = 'health:test';
      const testValue = { test: true, timestamp: Date.now() };
      
      await this.set(testKey, testValue, 1);
      const retrieved = await this.get(testKey);
      await this.delete(testKey);
      
      return retrieved !== null && (retrieved as any).test === true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
    memory: number;
  }> {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    // Estimativa de uso de memória (aproximada)
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2; // UTF-16
      memoryUsage += JSON.stringify(entry).length * 2;
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.cache.size,
      memory: memoryUsage,
    };
  }

  /**
   * Remove uma entrada usando a estratégia configurada
   */
  private evictEntry(): void {
    if (this.cache.size === 0) return;

    const strategy = this.config.strategy || 'lru';
    
    switch (strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'fifo':
        this.evictFIFO();
        break;
      case 'ttl':
        this.evictTTL();
        break;
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private evictFIFO(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private evictTTL(): void {
    let oldestKey = '';
    let oldestExpiry = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < oldestExpiry) {
        oldestExpiry = entry.expiresAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
