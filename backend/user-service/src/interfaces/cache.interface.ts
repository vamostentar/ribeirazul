/**
 * Interface para gerenciamento de cache
 * Abstrai diferentes implementações de cache (Redis, Memory, etc.)
 */
export interface CacheManager {
  /**
   * Obtém valor do cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Define valor no cache
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Remove valor do cache
   */
  delete(key: string): Promise<void>;

  /**
   * Remove múltiplas chaves do cache
   */
  deleteMany(keys: string[]): Promise<void>;

  /**
   * Verifica se chave existe no cache
   */
  exists(key: string): Promise<boolean>;

  /**
   * Define TTL para uma chave existente
   */
  expire(key: string, ttl: number): Promise<void>;

  /**
   * Obtém TTL restante de uma chave
   */
  ttl(key: string): Promise<number>;

  /**
   * Incrementa valor numérico
   */
  increment(key: string, value?: number): Promise<number>;

  /**
   * Decrementa valor numérico
   */
  decrement(key: string, value?: number): Promise<number>;

  /**
   * Limpa todo o cache
   */
  clear(): Promise<void>;

  /**
   * Obtém múltiplas chaves
   */
  getMany<T>(keys: string[]): Promise<Record<string, T | null>>;

  /**
   * Define múltiplas chaves
   */
  setMany<T>(data: Record<string, T>, ttl?: number): Promise<void>;

  /**
   * Busca chaves por padrão
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Obtém informações sobre o cache
   */
  info(): Promise<CacheInfo>;
}

/**
 * Informações sobre o cache
 */
export interface CacheInfo {
  type: string;
  version: string;
  uptime: number;
  connectedClients: number;
  usedMemory: string;
  totalKeys: number;
  hitRate: number;
}

/**
 * Configuração do cache
 */
export interface CacheConfig {
  enabled: boolean;
  defaultTtl: number;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetries?: number;
  retryDelayOnFailover?: number;
}
