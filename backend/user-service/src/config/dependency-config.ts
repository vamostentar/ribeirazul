import { CacheManager } from '@/interfaces/cache.interface';
import { DatabaseConnection } from '@/interfaces/database.interface';
import { ObservabilityManager } from '@/interfaces/observability.interface';

import { ConsoleObservabilityManager } from '@/implementations/console-observability';
import { MemoryCache } from '@/implementations/memory-cache';
import { PrismaDatabase } from '@/implementations/prisma-database';

import { config } from './index';

/**
 * Configuração centralizada de dependências
 * Gerencia a criação e configuração de todas as dependências do sistema
 */
export class DependencyConfig {
  private static instance: DependencyConfig;

  // Dependências singleton
  private _database?: DatabaseConnection;
  private _cache?: CacheManager;
  private _observability?: ObservabilityManager;

  private constructor() {}

  static getInstance(): DependencyConfig {
    if (!DependencyConfig.instance) {
      DependencyConfig.instance = new DependencyConfig();
    }
    return DependencyConfig.instance;
  }

  /**
   * Obtém instância do banco de dados
   */
  get database(): DatabaseConnection {
    if (!this._database) {
      this._database = new PrismaDatabase({
        url: config.databaseConfig.url,
        log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
      });
    }
    return this._database;
  }

  /**
   * Obtém instância do cache
   */
  get cache(): CacheManager {
    if (!this._cache) {
      const cacheConfig = {
        enabled: true,
        defaultTtl: config.CACHE_TTL || 300,
        host: config.redisConfig?.url ? 'redis' : undefined,
        port: config.redisConfig?.url ? 6379 : undefined,
      } as any;

      this._cache = new MemoryCache(cacheConfig);
    }
    return this._cache;
  }

  /**
   * Obtém instância do sistema de observabilidade
   */
  get observability(): ObservabilityManager {
    if (!this._observability) {
      const logLevel = config.LOG_LEVEL || 'info';
      const validLogLevels = ['debug', 'info', 'warn', 'error'];
      const mappedLogLevel = validLogLevels.includes(logLevel) ? logLevel : 'info';

      const observabilityConfig = {
        enabled: config.DEBUG_ENABLED || false,
        metricsEnabled: true,
        loggingEnabled: true,
        auditEnabled: true,
        metricsInterval: config.HEALTH_CHECK_INTERVAL || 30000,
        logLevel: mappedLogLevel as 'debug' | 'info' | 'warn' | 'error',
      };

      this._observability = new ConsoleObservabilityManager(observabilityConfig);
    }
    return this._observability;
  }

  /**
   * Reinicializa todas as dependências (útil para testes)
   */
  reset(): void {
    this._database = undefined as any;
    this._cache = undefined as any;
    this._observability = undefined as any;
  }

  /**
   * Configura dependências customizadas (útil para testes)
   */
  configure(options: {
    database?: DatabaseConnection;
    cache?: CacheManager;
    observability?: ObservabilityManager;
  }): void {
    if (options.database) this._database = options.database;
    if (options.cache) this._cache = options.cache;
    if (options.observability) this._observability = options.observability;
  }
}

/**
 * Instância singleton da configuração de dependências
 */
export const dependencyConfig = DependencyConfig.getInstance();
