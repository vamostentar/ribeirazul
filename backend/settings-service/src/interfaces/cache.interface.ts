import { SystemSettings } from '@/types/settings';

/**
 * Interface para cache
 */
export interface CacheManager {
  // Operações básicas
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Operações específicas
  getSettings(): Promise<SystemSettings | null>;
  setSettings(settings: SystemSettings, ttl?: number): Promise<void>;
  invalidateSettings(): Promise<void>;
  
  getModuleSettings(moduleName: string): Promise<Record<string, any> | null>;
  setModuleSettings(moduleName: string, settings: Record<string, any>, ttl?: number): Promise<void>;
  invalidateModuleSettings(moduleName: string): Promise<void>;

  // Operações de cache
  exists(key: string): Promise<boolean>;
  getTTL(key: string): Promise<number>;
  extendTTL(key: string, ttl: number): Promise<void>;

  // Health check
  isHealthy(): Promise<boolean>;
  getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
    memory: number;
  }>;
}

/**
 * Interface para observabilidade
 */
export interface ObservabilityManager {
  // Logging
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;

  // Métricas
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  recordGauge(name: string, value: number, labels?: Record<string, string>): void;

  // Tracing
  startTrace(name: string): string;
  startSpan(traceId: string, name: string): string;
  endSpan(spanId: string): void;
  endTrace(traceId: string): void;

  // Health check
  checkHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      lastCheck: string;
      error?: string;
    }>;
  }>;

  // Métricas específicas do settings service
  recordSettingsUpdate(fieldName: string, userId?: string): void;
  recordSettingsRead(userId?: string): void;
  recordModuleSettingsUpdate(moduleName: string, userId?: string): void;
  recordCacheHit(key: string): void;
  recordCacheMiss(key: string): void;
}
