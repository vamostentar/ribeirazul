import { config } from './index';
import { dependencyConfig } from './dependency-config';

/**
 * Configuração centralizada do sistema
 * Gerencia todas as configurações e dependências de forma unificada
 */
export class SystemConfig {
  private static instance: SystemConfig;

  private constructor() {}

  static getInstance(): SystemConfig {
    if (!SystemConfig.instance) {
      SystemConfig.instance = new SystemConfig();
    }
    return SystemConfig.instance;
  }

  /**
   * Configurações de segurança
   */
  get security() {
    return {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        historyCount: 5,
      },
      sessionPolicy: {
        timeout: config.securityConfig.sessionTimeout,
        maxConcurrentSessions: config.securityConfig.maxConcurrentSessions,
        cleanupInterval: config.SESSION_CLEANUP_INTERVAL || 3600,
      },
      lockoutPolicy: {
        maxAttempts: config.securityConfig.maxLoginAttempts,
        lockoutDuration: config.securityConfig.lockoutDuration,
        lockoutWindow: config.securityConfig.lockoutWindow,
      },
      jwtPolicy: {
        accessExpiry: config.jwtConfig.accessExpiry,
        refreshExpiry: config.jwtConfig.refreshExpiry,
        issuer: config.jwtConfig.issuer,
        audience: config.jwtConfig.audience,
      },
      twoFactorPolicy: {
        required: false,
        gracePeriod: 86400,
        issuer: config.TOTP_ISSUER,
        window: config.TOTP_WINDOW,
      },
    };
  }

  /**
   * Configurações de performance
   */
  get performance() {
    return {
      cache: {
        enabled: config.DEBUG_ENABLED || true,
        defaultTtl: config.CACHE_TTL || 300,
        redis: config.redisConfig,
      },
      database: {
        maxConnections: config.databaseConfig.maxConnections,
        timeout: 30000,
      },
      rateLimiting: {
        max: config.RATE_LIMIT_MAX,
        window: config.RATE_LIMIT_WINDOW,
        loginMax: config.LOGIN_RATE_LIMIT_MAX,
        loginWindow: config.LOGIN_RATE_LIMIT_WINDOW,
      },
    };
  }

  /**
   * Configurações de observabilidade
   */
  get observability() {
    return {
      enabled: config.DEBUG_ENABLED || false,
      metrics: {
        enabled: true,
        interval: config.HEALTH_CHECK_INTERVAL || 30000,
      },
      logging: {
        level: config.LOG_LEVEL || 'info',
        auditEnabled: config.LOG_AUDIT_ENABLED,
      },
      healthChecks: {
        enabled: true,
        interval: config.HEALTH_CHECK_INTERVAL || 30000,
        database: true,
        redis: !!config.redisConfig,
      },
    };
  }

  /**
   * Configurações de criptografia
   */
  get crypto() {
    return {
      passwordHashing: {
        algorithm: 'argon2' as const,
        ...config.argon2Config,
      },
      jwt: {
        algorithm: 'HS256' as const,
        ...config.jwtConfig,
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
      },
    };
  }

  /**
   * Configurações de recursos externos
   */
  get external() {
    return {
      email: config.emailConfig,
      redis: config.redisConfig,
      propertiesService: config.PROPERTIES_SERVICE_URL,
      mediaService: config.MEDIA_SERVICE_URL,
    };
  }

  /**
   * Dependências do sistema
   */
  get dependencies() {
    return {
      database: dependencyConfig.database,
      tokenManager: dependencyConfig.tokenManager,
      passwordHasher: dependencyConfig.passwordHasher,
      cache: dependencyConfig.cache,
      observability: dependencyConfig.observability,
      twoFactorManager: dependencyConfig.twoFactorManager,
    };
  }

  /**
   * Valida configurações críticas
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar JWT secret
    if (!config.jwtConfig.secret || config.jwtConfig.secret.length < 32) {
      errors.push('JWT secret must be at least 32 characters long');
    }

    // Validar database URL
    if (!config.databaseConfig.url) {
      errors.push('Database URL is required');
    }

    // Validar configurações de produção
    if (config.isProduction) {
      if (config.jwtConfig.secret.length < 64) {
        errors.push('Production JWT secret must be at least 64 characters long');
      }

      if (!config.redisConfig) {
        errors.push('Redis configuration is recommended for production');
      }
    }

    // Validar portas
    if (config.PORT < 1000 || config.PORT > 65535) {
      errors.push('Port must be between 1000 and 65535');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtém configuração de ambiente
   */
  get environment() {
    return {
      nodeEnv: config.NODE_ENV,
      port: config.PORT,
      host: config.HOST,
      version: process.env.npm_package_version || '1.0.0',
      debug: config.DEBUG_ENABLED,
      test: config.isTest,
    };
  }

  /**
   * Obtém configurações de API
   */
  get api() {
    return {
      title: config.API_TITLE,
      description: config.API_DESCRIPTION,
      version: config.API_VERSION,
      swagger: {
        enabled: config.SWAGGER_ENABLED,
        path: '/docs',
      },
      cors: {
        origins: config.corsOrigins,
        credentials: true,
      },
      rateLimit: {
        max: config.RATE_LIMIT_MAX,
        window: config.RATE_LIMIT_WINDOW,
      },
    };
  }

  /**
   * Obtém todas as configurações como um objeto plano
   */
  toJSON() {
    return {
      environment: this.environment,
      security: this.security,
      performance: this.performance,
      observability: this.observability,
      crypto: this.crypto,
      external: this.external,
      api: this.api,
      dependencies: 'Dependencies loaded',
    };
  }

  /**
   * Recarrega configurações (útil para desenvolvimento)
   */
  reload(): void {
    // Força recarregamento das dependências
    dependencyConfig.reset();
  }
}

/**
 * Instância singleton da configuração do sistema
 */
export const systemConfig = SystemConfig.getInstance();
