import { z } from 'zod';

/**
 * Schema de validação para configurações do sistema
 */
const configSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8085),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),
  DB_MAX_CONNECTIONS: z.coerce.number().default(10),
  DB_CONNECTION_TIMEOUT: z.coerce.number().default(30000),
  DB_QUERY_TIMEOUT: z.coerce.number().default(30000),
  DB_ENABLE_LOGGING: z.coerce.boolean().default(false),

  // Redis/Cache
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  CACHE_TTL: z.coerce.number().default(300), // 5 minutes
  CACHE_MAX_SIZE: z.coerce.number().default(1000),
  CACHE_STRATEGY: z.enum(['lru', 'fifo', 'ttl']).default('lru'),

  // Security
  ENABLE_RATE_LIMIT: z.coerce.boolean().default(true),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'), // 1 minute
  ENABLE_CORS: z.coerce.boolean().default(true),
  CORS_ORIGIN: z.string().default(process.env.API_URL || 'http://localhost:3001'),
  ENABLE_HELMET: z.coerce.boolean().default(true),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_ENABLE_AUDIT: z.coerce.boolean().default(true),
  LOG_ENABLE_METRICS: z.coerce.boolean().default(true),

  // Monitoring
  HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000), // 30 seconds
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_INTERVAL: z.coerce.number().default(60000), // 1 minute

  // API Documentation
  SWAGGER_ENABLED: z.coerce.boolean().default(true),
  API_TITLE: z.string().default('Ribeira Azul Settings Service'),
  API_VERSION: z.string().default('1.0.0'),
  API_DESCRIPTION: z.string().default('Settings and Configuration Service for Ribeira Azul Real Estate Platform'),

  // External Services
  AUTH_SERVICE_URL: z.string().url().optional(),
  PROPERTIES_SERVICE_URL: z.string().url().optional(),
  MEDIA_SERVICE_URL: z.string().url().optional(),

  // Development/Debug
  DEBUG_ENABLED: z.coerce.boolean().default(false),
  SEED_DEFAULT_SETTINGS: z.coerce.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Normalize allowed CORS origins to include both www and non-www variants.
 * Accepts CSV string or array and returns unique origins.
 */
export function getCorsOrigins(raw?: string | string[]) {
  const corsVar = raw || process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || process.env.API_URL || '';
  const arr = (typeof corsVar === 'string' ? corsVar.split(',') : corsVar).map((s: string) => s.trim()).filter(Boolean);
  const normalized = new Set<string>();
  for (const o of arr) {
    try {
      const u = new URL(o);
      normalized.add(u.origin);
      const host = u.hostname;
      if (host.startsWith('www.')) {
        normalized.add(`${u.protocol}//${host.replace(/^www\./, '')}`);
      } else {
        normalized.add(`${u.protocol}//www.${host}`);
      }
    } catch (e) {
      if (typeof o === 'string' && o.length) normalized.add(o);
    }
  }
  return Array.from(normalized);
}

/**
 * Serviço de configuração centralizado
 * Singleton pattern para acesso global às configurações
 */
class ConfigService {
  private static instance: ConfigService;
  private _config: Config;

  private constructor() {
    this._config = this.loadConfig();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): Config {
    try {
      const rawConfig = {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        HOST: process.env.HOST,
        DATABASE_URL: process.env.DATABASE_URL,
        DB_MAX_CONNECTIONS: process.env.DB_MAX_CONNECTIONS,
        DB_CONNECTION_TIMEOUT: process.env.DB_CONNECTION_TIMEOUT,
        DB_QUERY_TIMEOUT: process.env.DB_QUERY_TIMEOUT,
        DB_ENABLE_LOGGING: process.env.DB_ENABLE_LOGGING,
        REDIS_URL: process.env.REDIS_URL,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        REDIS_DB: process.env.REDIS_DB,
        CACHE_TTL: process.env.CACHE_TTL,
        CACHE_MAX_SIZE: process.env.CACHE_MAX_SIZE,
        CACHE_STRATEGY: process.env.CACHE_STRATEGY,
        ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT,
        RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
        RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
        ENABLE_CORS: process.env.ENABLE_CORS,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        ENABLE_HELMET: process.env.ENABLE_HELMET,
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_FORMAT: process.env.LOG_FORMAT,
        LOG_ENABLE_AUDIT: process.env.LOG_ENABLE_AUDIT,
        LOG_ENABLE_METRICS: process.env.LOG_ENABLE_METRICS,
        HEALTH_CHECK_INTERVAL: process.env.HEALTH_CHECK_INTERVAL,
        METRICS_ENABLED: process.env.METRICS_ENABLED,
        METRICS_INTERVAL: process.env.METRICS_INTERVAL,
        SWAGGER_ENABLED: process.env.SWAGGER_ENABLED,
        API_TITLE: process.env.API_TITLE,
        API_VERSION: process.env.API_VERSION,
        API_DESCRIPTION: process.env.API_DESCRIPTION,
        AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
        PROPERTIES_SERVICE_URL: process.env.PROPERTIES_SERVICE_URL,
        MEDIA_SERVICE_URL: process.env.MEDIA_SERVICE_URL,
        DEBUG_ENABLED: process.env.DEBUG_ENABLED,
        SEED_DEFAULT_SETTINGS: process.env.SEED_DEFAULT_SETTINGS,
      };

      return configSchema.parse(rawConfig);
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      throw new Error('Configuração inválida');
    }
  }

  get config(): Config {
    return this._config;
  }

  get isDevelopment(): boolean {
    return this._config.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this._config.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this._config.NODE_ENV === 'test';
  }

  /**
   * Valida as configurações atuais
   */
  validate(): { valid: boolean; errors: string[] } {
    try {
      configSchema.parse(this._config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return {
        valid: false,
        errors: ['Erro desconhecido na validação']
      };
    }
  }

  /**
   * Recarrega as configurações (útil para testes)
   */
  reload(): void {
    this._config = this.loadConfig();
  }
}

/**
 * Instância singleton da configuração
 */
export const config = ConfigService.getInstance();

/**
 * Configurações específicas para diferentes ambientes
 */
export const environmentConfigs = {
  development: {
    LOG_LEVEL: 'debug' as const,
    DEBUG_ENABLED: true,
    SWAGGER_ENABLED: true,
    CACHE_TTL: 60, // 1 minute for faster development
  },
  production: {
    LOG_LEVEL: 'info' as const,
    DEBUG_ENABLED: false,
    SWAGGER_ENABLED: false,
    CACHE_TTL: 300, // 5 minutes
  },
  test: {
    LOG_LEVEL: 'error' as const,
    DEBUG_ENABLED: false,
    SWAGGER_ENABLED: false,
    CACHE_TTL: 10, // 10 seconds for tests
  },
} as const;
