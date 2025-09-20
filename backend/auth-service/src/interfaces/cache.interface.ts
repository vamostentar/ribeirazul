/**
 * Interface para abstração de sistema de cache
 * Permite trocar implementações (Redis, Memory, etc.) sem afetar o código de negócio
 */
export interface CacheManager {
  /**
   * Obtém um valor do cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Define um valor no cache
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Remove um valor do cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Verifica se uma chave existe no cache
   */
  exists(key: string): Promise<boolean>;

  /**
   * Remove todas as chaves que correspondem ao padrão
   */
  deletePattern(pattern: string): Promise<number>;

  /**
   * Limpa todo o cache
   */
  clear(): Promise<void>;

  /**
   * Obtém múltiplas chaves
   */
  getMultiple<T>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Define múltiplos valores
   */
  setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<void>;

  /**
   * Incrementa um valor numérico
   */
  increment(key: string, amount?: number): Promise<number>;

  /**
   * Define TTL para uma chave existente
   */
  expire(key: string, ttl: number): Promise<boolean>;

  /**
   * Obtém TTL restante para uma chave
   */
  getTtl(key: string): Promise<number>;

  /**
   * Obtém estatísticas do cache
   */
  getStats(): Promise<CacheStats>;
}

/**
 * Interface para estatísticas do cache
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  memoryUsage?: number;
  uptime: number;
}

/**
 * Interface para configuração do cache
 */
export interface CacheConfig {
  enabled: boolean;
  defaultTtl: number;
  maxMemory?: number;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

/**
 * Interface para cache com suporte a tags
 */
export interface TaggedCacheManager extends CacheManager {
  /**
   * Define valor com tags
   */
  setWithTags<T>(key: string, value: T, tags: string[], ttl?: number): Promise<void>;

  /**
   * Remove todas as chaves com uma tag específica
   */
  deleteByTag(tag: string): Promise<number>;

  /**
   * Remove múltiplas tags
   */
  deleteByTags(tags: string[]): Promise<number>;

  /**
   * Obtém tags de uma chave
   */
  getTags(key: string): Promise<string[]>;
}
