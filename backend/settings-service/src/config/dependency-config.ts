import { CacheManager } from '@/interfaces/cache.interface';
import { DatabaseConnection } from '@/interfaces/database.interface';
import { ObservabilityManager } from '@/interfaces/observability.interface';
import { SettingsValidator } from '@/interfaces/validator.interface';

import { ConsoleObservabilityManager } from '@/implementations/console-observability';
import { MemoryCache } from '@/implementations/memory-cache';
import { PrismaDatabase } from '@/implementations/prisma-database';
import { ZodSettingsValidator } from '@/implementations/zod-settings-validator';

import { config } from './system-config';

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
  private _validator?: SettingsValidator;

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
      const dbConfig = {
        url: config.config.DATABASE_URL,
        maxConnections: config.config.DB_MAX_CONNECTIONS,
        connectionTimeout: config.config.DB_CONNECTION_TIMEOUT,
        queryTimeout: config.config.DB_QUERY_TIMEOUT,
        enableLogging: config.config.DB_ENABLE_LOGGING,
      };

      this._database = new PrismaDatabase(dbConfig);
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
        ttl: config.config.CACHE_TTL,
        maxSize: config.config.CACHE_MAX_SIZE,
        strategy: config.config.CACHE_STRATEGY,
        host: config.config.REDIS_URL ? 'redis' : 'localhost',
        port: config.config.REDIS_URL ? config.config.REDIS_PORT : 6379,
        password: config.config.REDIS_PASSWORD || '',
        db: config.config.REDIS_DB,
      };

      this._cache = new MemoryCache(cacheConfig);
    }
    return this._cache;
  }

  /**
   * Obtém instância do sistema de observabilidade
   */
  get observability(): ObservabilityManager {
    if (!this._observability) {
      const observabilityConfig = {
        enabled: config.config.DEBUG_ENABLED,
        metricsEnabled: config.config.METRICS_ENABLED,
        loggingEnabled: true,
        auditEnabled: config.config.LOG_ENABLE_AUDIT,
        metricsInterval: config.config.METRICS_INTERVAL,
        logLevel: config.config.LOG_LEVEL,
        logFormat: config.config.LOG_FORMAT,
      };

      this._observability = new ConsoleObservabilityManager(observabilityConfig);
    }
    return this._observability;
  }

  /**
   * Obtém instância do validador
   */
  get validator(): SettingsValidator {
    if (!this._validator) {
      this._validator = new ZodSettingsValidator();
    }
    return this._validator;
  }

  /**
   * Reinicializa todas as dependências (útil para testes)
   */
  reset(): void {
    this._database = null as any;
    this._cache = null as any;
    this._observability = null as any;
    this._validator = null as any;
  }

  /**
   * Configura dependências customizadas (útil para testes)
   */
  configure(options: {
    database?: DatabaseConnection;
    cache?: CacheManager;
    observability?: ObservabilityManager;
    validator?: SettingsValidator;
  }): void {
    if (options.database) this._database = options.database;
    if (options.cache) this._cache = options.cache;
    if (options.observability) this._observability = options.observability;
    if (options.validator) this._validator = options.validator;
  }

  /**
   * Inicializa todas as dependências
   */
  async initialize(): Promise<void> {
    try {
      // Conectar ao banco de dados
      await this.database.connect();
      
      // Verificar saúde do cache
      const cacheHealthy = await this.cache.isHealthy();
      if (!cacheHealthy) {
        this.observability.warn('Cache não está saudável, continuando sem cache');
      }

      this.observability.info('Dependências inicializadas com sucesso');
    } catch (error) {
      this.observability.error('Erro ao inicializar dependências', { error });
      throw error;
    }
  }

  /**
   * Finaliza todas as dependências
   */
  async shutdown(): Promise<void> {
    try {
      await this.database.disconnect();
      this.observability.info('Dependências finalizadas com sucesso');
    } catch (error) {
      this.observability.error('Erro ao finalizar dependências', { error });
    }
  }
}

/**
 * Instância singleton da configuração de dependências
 */
export const dependencyConfig = DependencyConfig.getInstance();
