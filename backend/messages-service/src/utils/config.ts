import { config as dotenv } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env in development only
// In production, rely on environment variables injected by Coolify/Docker
if (process.env.NODE_ENV !== 'production') {
  dotenv();
}

const schema = z.object({
  // Environment
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(8090),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace']).default('info'),
  
  // Database
  DATABASE_URL: z.string().min(1),
  DB_POOL_SIZE: z.coerce.number().default(10),
  DB_TIMEOUT: z.coerce.number().default(30000),
  
  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_MAX_RETRIES: z.coerce.number().default(3),
  REDIS_RETRY_DELAY: z.coerce.number().default(1000),
  
  // SMTP Configuration
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  EMAIL_TIMEOUT: z.coerce.number().default(30000),
  SMTP_VERIFY_CONNECTION: z.coerce.boolean().default(true),
  
  // IMAP Configuration
  IMAP_HOST: z.string().min(1),
  IMAP_PORT: z.coerce.number().default(993),
  IMAP_SECURE: z.coerce.boolean().default(true),
  IMAP_USER: z.string().min(1),
  IMAP_PASS: z.string().min(1),
  IMAP_POLL_INTERVAL: z.coerce.number().default(30000),
  
  // Queue Configuration
  QUEUE_CONCURRENCY: z.coerce.number().default(5),
  QUEUE_MAX_ATTEMPTS: z.coerce.number().default(3),
  QUEUE_BACKOFF_DELAY: z.coerce.number().default(2000),
  QUEUE_RETRY_MULTIPLIER: z.coerce.number().default(2),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  RATE_LIMIT_PER_USER_MAX: z.coerce.number().default(10),
  
  // Security
  JWT_SECRET: z.string().min(32).optional(),
  API_KEY_HEADER: z.string().default('x-api-key'),
  ALLOWED_API_KEYS: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.boolean().default(false),
  
  // Circuit Breaker
  CIRCUIT_BREAKER_TIMEOUT: z.coerce.number().default(10000),
  CIRCUIT_BREAKER_ERROR_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_BREAKER_RESET_TIMEOUT: z.coerce.number().default(30000),
  
  // Monitoring & Observability
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().default(9090),
  TRACING_ENABLED: z.coerce.boolean().default(true),
  HEALTH_CHECK_TIMEOUT: z.coerce.number().default(5000),
  
  // Cache
  CACHE_TTL: z.coerce.number().default(300),
  CACHE_MAX_SIZE: z.coerce.number().default(1000),
  
  // Graceful Shutdown
  SHUTDOWN_TIMEOUT: z.coerce.number().default(10000),
  
  // Performance
  MAX_PAYLOAD_SIZE: z.coerce.number().default(1048576), // 1MB
  REQUEST_TIMEOUT: z.coerce.number().default(30000),
});

export type Config = z.infer<typeof schema>;

class ConfigService {
  private static instance: ConfigService;
  private _config: Config;

  private constructor() {
    const result = schema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Invalid configuration:', result.error.format());
      throw new Error('Invalid configuration');
    }
    
    this._config = result.data;
    
    // Log important config (without secrets)
    console.log('✅ Configuration loaded:', {
      NODE_ENV: this._config.NODE_ENV,
      HOST: this._config.HOST,
      PORT: this._config.PORT,
      LOG_LEVEL: this._config.LOG_LEVEL,
      METRICS_ENABLED: this._config.METRICS_ENABLED,
      TRACING_ENABLED: this._config.TRACING_ENABLED,
      QUEUE_CONCURRENCY: this._config.QUEUE_CONCURRENCY,
    });
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

  // Helper methods for complex configurations
  get corsOrigins(): string[] {
    if (!this._config.CORS_ORIGINS || this._config.CORS_ORIGINS.trim().length === 0) {
      return ['*'];
    }
    return this._config.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
  }

  get allowedApiKeys(): Set<string> {
    if (!this._config.ALLOWED_API_KEYS || 
        this._config.ALLOWED_API_KEYS.trim().length === 0 ||
        this._config.ALLOWED_API_KEYS === 'your-production-api-keys-here') {
      return new Set();
    }
    return new Set(this._config.ALLOWED_API_KEYS.split(',').map(key => key.trim()).filter(Boolean));
  }

  get redisConfig() {
    return {
      url: this._config.REDIS_URL,
      password: this._config.REDIS_PASSWORD,
      db: this._config.REDIS_DB,
      maxRetriesPerRequest: this._config.REDIS_MAX_RETRIES,
      retryDelayOnFailover: this._config.REDIS_RETRY_DELAY,
    };
  }

  get circuitBreakerConfig() {
    return {
      timeout: this._config.CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: this._config.CIRCUIT_BREAKER_ERROR_THRESHOLD,
      resetTimeout: this._config.CIRCUIT_BREAKER_RESET_TIMEOUT,
    };
  }
}

export const configService = ConfigService.getInstance();
export const config = configService.config;


