


import { CacheManager } from '@/interfaces/cache.interface';
import { DatabaseConnection } from '@/interfaces/database.interface';
import { ObservabilityManager } from '@/interfaces/observability.interface';
import { PasswordHasher } from '@/interfaces/password-hasher.interface';
import { TokenManager } from '@/interfaces/token-manager.interface';
import { TwoFactorManager } from '@/interfaces/two-factor.interface';

import { Argon2PasswordHasher } from '@/implementations/argon2-password-hasher';
import { ConsoleObservabilityManager } from '@/implementations/console-observability';
import { JWTTokenManager } from '@/implementations/jwt-token-manager';
import { MemoryCache } from '@/implementations/memory-cache';
import { TOTPProvider } from '@/implementations/totp-provider';

import { config } from './index';

/**
 * Configuração centralizada de dependências
 * Gerencia a criação e configuração de todas as dependências do sistema
 */
export class DependencyConfig {
  private static instance: DependencyConfig;

  // Dependências singleton
  private _database?: DatabaseConnection;
  private _tokenManager?: TokenManager;
  private _passwordHasher?: PasswordHasher;
  private _cache?: CacheManager;
  private _observability?: ObservabilityManager;
  private _twoFactorManager?: TwoFactorManager;

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
      // Em uma implementação real, isso seria configurado via config
      // Por enquanto, criamos uma instância mock que implementa a interface
      this._database = {
        connect: async () => {},
        disconnect: async () => {},
        isConnected: async () => true,
        transaction: async (callback: (tx: any) => Promise<any>) => callback({} as any),
        users: {} as any,
        roles: {} as any,
        sessions: {} as any,
        audit: {} as any,
        apiKeys: {} as any,
      };
    }
    return this._database;
  }

  /**
   * Obtém instância do gerenciador de tokens
   */
  get tokenManager(): TokenManager {
    if (!this._tokenManager) {
      const tokenConfig = {
        secret: config.jwtConfig.secret,
        accessExpiry: config.jwtConfig.accessExpiry,
        refreshExpiry: config.jwtConfig.refreshExpiry,
        issuer: config.jwtConfig.issuer,
        audience: config.jwtConfig.audience,
      };

      this._tokenManager = new JWTTokenManager(tokenConfig);
    }
    return this._tokenManager;
  }

  /**
   * Obtém instância do hasher de senhas
   */
  get passwordHasher(): PasswordHasher {
    if (!this._passwordHasher) {
      const passwordConfig = {
        algorithm: 'argon2' as const,
        ...config.argon2Config,
      };

      this._passwordHasher = new Argon2PasswordHasher(passwordConfig);
    }
    return this._passwordHasher;
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
   * Obtém instância do gerenciador de 2FA
   */
  get twoFactorManager(): TwoFactorManager {
    if (!this._twoFactorManager) {
      const totpProvider = new TOTPProvider({
        enabled: true,
        defaultProvider: 'totp',
        window: config.TOTP_WINDOW || 2,
        maxAttempts: config.MAX_LOGIN_ATTEMPTS || 5,
        lockoutDuration: config.LOCKOUT_DURATION || 900,
      });

      this._twoFactorManager = {
        registerProvider: (provider: any) => {
          // Implementação básica
          console.log(`Provider registered: ${provider.name}`);
        },
        generateSetup: async (userId: string, userEmail: string) => {
          return totpProvider.generateSetup(userId, userEmail);
        },
        verify: async (userId: string, code: string) => {
          return totpProvider.verify(userId, code);
        },
        verifyWithProvider: async (providerName: string, userId: string, code: string) => {
          if (providerName === 'totp') {
            return totpProvider.verify(userId, code);
          }
          return false;
        },
        disable: async (userId: string) => {
          return totpProvider.disable(userId);
        },
        getAvailableProviders: () => ['totp'],
        setDefaultProvider: (providerName: string) => {
          console.log(`Default provider set to: ${providerName}`);
        },
      };
    }
    return this._twoFactorManager;
  }

  /**
   * Reinicializa todas as dependências (útil para testes)
   */
  reset(): void {
    this._database = undefined;
    this._tokenManager = undefined;
    this._passwordHasher = undefined;
    this._cache = undefined;
    this._observability = undefined;
    this._twoFactorManager = undefined;
  }

  /**
   * Configura dependências customizadas (útil para testes)
   */
  configure(options: {
    database?: DatabaseConnection;
    tokenManager?: TokenManager;
    passwordHasher?: PasswordHasher;
    cache?: CacheManager;
    observability?: ObservabilityManager;
    twoFactorManager?: TwoFactorManager;
  }): void {
    if (options.database) this._database = options.database;
    if (options.tokenManager) this._tokenManager = options.tokenManager;
    if (options.passwordHasher) this._passwordHasher = options.passwordHasher;
    if (options.cache) this._cache = options.cache;
    if (options.observability) this._observability = options.observability;
    if (options.twoFactorManager) this._twoFactorManager = options.twoFactorManager;
  }
}

/**
 * Instância singleton da configuração de dependências
 */
export const dependencyConfig = DependencyConfig.getInstance();

// Factory functions removed for simplicity
