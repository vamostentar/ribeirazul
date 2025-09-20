import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenvConfig();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8082),
  HOST: z.string().default('0.0.0.0'),
  
  // CORS
  CORS_ORIGIN: z.string().default(process.env.API_URL || 'http://localhost:3001'),
  
  // Base URL for serving static files and generating image URLs
  BASE_URL: z.string().optional(),
  
  // Database
  DATABASE_URL: z.string().min(1),
  DB_MAX_CONNECTIONS: z.coerce.number().default(10),
  
  // Redis (opcional)
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.coerce.number().default(300), // 5 minutes
  
  // Auth (preparando para futuro)
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRY: z.string().default('24h'),
  
  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Business rules
  MAX_PROPERTIES_PER_PAGE: z.coerce.number().default(100),
  DEFAULT_PROPERTIES_PER_PAGE: z.coerce.number().default(20),
  MAX_PRICE: z.coerce.number().default(100_000_000), // €100M
  MAX_PROPERTY_TITLE_LENGTH: z.coerce.number().default(200),
  MAX_PROPERTY_DESCRIPTION_LENGTH: z.coerce.number().default(2000),
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
}

export const configService = ConfigService.getInstance();
export const config = {
  ...configService.config,
  isDevelopment: configService.isDevelopment,
  isProduction: configService.isProduction,
  isTest: configService.isTest,
};
