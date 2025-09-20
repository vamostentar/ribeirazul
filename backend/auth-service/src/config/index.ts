import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file only in development
// In production, rely on environment variables from docker-compose
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

const configSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8084),
  HOST: z.string().default('0.0.0.0'),
  
  // CORS
  CORS_ORIGIN: z.string().default(process.env.API_URL || 'http://localhost:3001'),
  
  // Database
  DATABASE_URL: z.string().min(1),
  DB_MAX_CONNECTIONS: z.coerce.number().default(10),
  
  // Redis (for sessions, rate limiting, caching)
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  CACHE_TTL: z.coerce.number().default(300), // 5 minutes
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('4h'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_ISSUER: z.string().default('ribeirazul-auth-service'),
  JWT_AUDIENCE: z.string().default('ribeirazul-api'),
  
  // Password Security
  ARGON2_MEMORY_COST: z.coerce.number().default(65536), // 64 MB
  ARGON2_TIME_COST: z.coerce.number().default(3),       // 3 iterations
  ARGON2_PARALLELISM: z.coerce.number().default(4),     // 4 threads
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().default(5),
  LOGIN_RATE_LIMIT_WINDOW: z.string().default('15 minutes'),
  
  // Account Security
  MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
  LOCKOUT_DURATION: z.coerce.number().default(900),     // 15 minutes
  LOCKOUT_WINDOW: z.coerce.number().default(300),       // 5 minutes
  
  // Session Management
  SESSION_TIMEOUT: z.coerce.number().default(86400),    // 24 hours
  MAX_CONCURRENT_SESSIONS: z.coerce.number().default(5),
  SESSION_CLEANUP_INTERVAL: z.coerce.number().default(3600), // 1 hour
  
  // Two-Factor Authentication
  TOTP_ISSUER: z.string().default('Ribeira Azul'),
  TOTP_WINDOW: z.coerce.number().default(2),            // Allow 2 steps tolerance
  
  // Email Configuration (for verification, password reset)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@ribeirazul.com'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_AUDIT_ENABLED: z.coerce.boolean().default(true),
  
  // Security Headers
  HELMET_ENABLED: z.coerce.boolean().default(true),
  TRUST_PROXY: z.coerce.boolean().default(false),
  
  // API Documentation
  SWAGGER_ENABLED: z.coerce.boolean().default(true),
  API_TITLE: z.string().default('Ribeira Azul Auth Service'),
  API_VERSION: z.string().default('1.0.0'),
  API_DESCRIPTION: z.string().default('Authentication and Authorization Service for Ribeira Azul Real Estate Platform'),
  
  // Monitoring and Health
  HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000), // 30 seconds
  METRICS_ENABLED: z.coerce.boolean().default(true),
  
  // External Services
  PROPERTIES_SERVICE_URL: z.string().url().optional(),
  MEDIA_SERVICE_URL: z.string().url().optional(),
  
  // Development/Debug
  DEBUG_ENABLED: z.coerce.boolean().default(false),
  SEED_DEFAULT_ADMIN: z.coerce.boolean().default(true),
  DEFAULT_ADMIN_EMAIL: z.string().email().default('admin@ribeirazul.com'),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default('Admin123!'),
  
});

export type Config = z.infer<typeof configSchema>;

class ConfigService {
  private static instance: ConfigService;
  private _config: Config;

  private constructor() {
    const result = configSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Invalid configuration:', result.error.format());
      throw new Error('Invalid configuration');
    }
    
    this._config = result.data;
    
    // Validate environment-specific requirements
    this.validateEnvironmentConfig();
  }

  private validateEnvironmentConfig(): void {
    const { NODE_ENV } = this._config;
    
    // Production-specific validations
    if (NODE_ENV === 'production') {
      if (this._config.JWT_SECRET.length < 64) {
        throw new Error('Production JWT secret must be at least 64 characters');
      }
      
      if (this._config.DEFAULT_ADMIN_PASSWORD === 'Admin123!') {
        console.warn('⚠️  WARNING: Using default admin password in production!');
      }
      
      if (!this._config.REDIS_URL) {
        console.warn('⚠️  WARNING: Redis not configured. Sessions will be memory-only!');
      }
    }
    
    // Development helpers
    if (NODE_ENV === 'development') {
      console.log('🔧 Development mode: Enhanced logging and debugging enabled');
    }
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
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

  get corsOrigins(): string[] {
    return this._config.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }

  get databaseConfig() {
    return {
      url: this._config.DATABASE_URL,
      maxConnections: this._config.DB_MAX_CONNECTIONS,
    };
  }

  get redisConfig() {
    if (!this._config.REDIS_URL) return null;
    
    return {
      url: this._config.REDIS_URL,
      password: this._config.REDIS_PASSWORD,
      db: this._config.REDIS_DB,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    };
  }

  get jwtConfig() {
    return {
      secret: this._config.JWT_SECRET,
      accessExpiry: this._config.JWT_ACCESS_EXPIRY,
      refreshExpiry: this._config.JWT_REFRESH_EXPIRY,
      issuer: this._config.JWT_ISSUER,
      audience: this._config.JWT_AUDIENCE,
    };
  }

  get argon2Config() {
    return {
      memoryCost: this._config.ARGON2_MEMORY_COST,
      timeCost: this._config.ARGON2_TIME_COST,
      parallelism: this._config.ARGON2_PARALLELISM,
    };
  }

  get securityConfig() {
    return {
      maxLoginAttempts: this._config.MAX_LOGIN_ATTEMPTS,
      lockoutDuration: this._config.LOCKOUT_DURATION,
      lockoutWindow: this._config.LOCKOUT_WINDOW,
      sessionTimeout: this._config.SESSION_TIMEOUT,
      maxConcurrentSessions: this._config.MAX_CONCURRENT_SESSIONS,
    };
  }

  get emailConfig() {
    if (!this._config.SMTP_HOST) return null;
    
    return {
      host: this._config.SMTP_HOST,
      port: this._config.SMTP_PORT,
      secure: this._config.SMTP_SECURE,
      auth: this._config.SMTP_USER ? {
        user: this._config.SMTP_USER,
        pass: this._config.SMTP_PASS,
      } : undefined,
      from: this._config.EMAIL_FROM,
    };
  }
}

export const configService = ConfigService.getInstance();
export const config = {
  ...configService.config,
  isDevelopment: configService.isDevelopment,
  isProduction: configService.isProduction,
  isTest: configService.isTest,
  corsOrigins: configService.corsOrigins,
  databaseConfig: configService.databaseConfig,
  redisConfig: configService.redisConfig,
  jwtConfig: configService.jwtConfig,
  argon2Config: configService.argon2Config,
  securityConfig: configService.securityConfig,
  emailConfig: configService.emailConfig,
  
  // Additional properties for compatibility
  TRUST_PROXY: true,
  HELMET_ENABLED: configService.isProduction,
  TOTP_WINDOW: 2, // 2 * 30 seconds = 1 minute window
};
