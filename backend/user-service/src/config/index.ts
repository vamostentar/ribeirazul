import type { InterestType, SortBy, UserRole, ViewMode } from '@prisma/client';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

/**
 * Configuração centralizada do sistema
 * Segue o padrão de black box - expõe apenas o necessário
 */
export const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8086', 10),
  HOST: process.env.HOST || '0.0.0.0',
  
  // Database
  databaseConfig: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5436/users',
  },
  
  // Redis
  redisConfig: process.env.REDIS_URL ? {
    url: process.env.REDIS_URL,
  } : undefined,
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || 
               process.env.CORS_ORIGIN?.split(',') ||
               (process.env.API_URL ? [process.env.API_URL] : ['http://localhost:3001', 'http://localhost:3000']),
  corsAllowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-API-Key'
  ],
  
  // Rate limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  
  // Cache
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
  ENABLE_DETAILED_LOGGING: process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production',
  
  // Security
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
  HELMET_ENABLED: process.env.HELMET_ENABLED !== 'false',
  
  // Content Security Policy
  cspConfig: {
    defaultSrc: process.env.CSP_DEFAULT_SRC?.split(',') || ["'self'"],
    styleSrc: process.env.CSP_STYLE_SRC?.split(',') || ["'self'", "'unsafe-inline'"],
    scriptSrc: process.env.CSP_SCRIPT_SRC?.split(',') || ["'self'"],
    imgSrc: process.env.CSP_IMG_SRC?.split(',') || ["'self'", "data:", "https:"],
  },
  
  // System monitoring (under pressure)
  systemLimits: {
    maxEventLoopDelay: parseInt(process.env.MAX_EVENT_LOOP_DELAY || '1000', 10),
    maxHeapUsedBytes: parseInt(process.env.MAX_HEAP_USED_BYTES || '1000000000', 10), // 1GB
    maxRssBytes: parseInt(process.env.MAX_RSS_BYTES || '1000000000', 10), // 1GB
    maxEventLoopUtilization: parseFloat(process.env.MAX_EVENT_LOOP_UTILIZATION || '0.98'),
    pressureMessage: process.env.PRESSURE_MESSAGE || 'Under pressure!',
    retryAfter: parseInt(process.env.PRESSURE_RETRY_AFTER || '50', 10),
  },
  
  // API Documentation
  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED !== 'false',
  API_TITLE: process.env.API_TITLE || 'Ribeira Azul User Service',
  API_DESCRIPTION: process.env.API_DESCRIPTION || 'User Management Microservice for Ribeira Azul Real Estate Platform',
  API_VERSION: process.env.npm_package_version || process.env.API_VERSION || '1.0.0',
  API_CONTACT_NAME: process.env.API_CONTACT_NAME || 'Ribeira Azul Team',
  API_CONTACT_EMAIL: process.env.API_CONTACT_EMAIL || 'tech@ribeirazul.com',
  
  // Health checks
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  
  // Debug
  DEBUG_ENABLED: process.env.DEBUG_ENABLED === 'true',
  
  // External services
  PROPERTIES_SERVICE_URL: process.env.PROPERTIES_SERVICE_URL || 'http://properties:8082',
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://auth:8084',
  
  // User service specific
  MAX_PROFILES_PER_PAGE: parseInt(process.env.MAX_PROFILES_PER_PAGE || '50', 10),
  DEFAULT_PROFILES_PER_PAGE: parseInt(process.env.DEFAULT_PROFILES_PER_PAGE || '20', 10),
  MAX_NOTIFICATIONS_PER_PAGE: parseInt(process.env.MAX_NOTIFICATIONS_PER_PAGE || '100', 10),
  DEFAULT_NOTIFICATIONS_PER_PAGE: parseInt(process.env.DEFAULT_NOTIFICATIONS_PER_PAGE || '20', 10),
  
  // User preferences defaults
  userPreferencesDefaults: {
    emailNotifications: process.env.DEFAULT_EMAIL_NOTIFICATIONS !== 'false',
    smsNotifications: process.env.DEFAULT_SMS_NOTIFICATIONS === 'true',
    pushNotifications: process.env.DEFAULT_PUSH_NOTIFICATIONS !== 'false',
    priceDropAlerts: process.env.DEFAULT_PRICE_DROP_ALERTS !== 'false',
    newPropertyAlerts: process.env.DEFAULT_NEW_PROPERTY_ALERTS !== 'false',
    marketUpdateAlerts: process.env.DEFAULT_MARKET_UPDATE_ALERTS === 'true',
    searchRadius: parseInt(process.env.DEFAULT_SEARCH_RADIUS || '20', 10),
    sortBy: (process.env.DEFAULT_SORT_BY || 'RELEVANCE') as SortBy,
    viewMode: (process.env.DEFAULT_VIEW_MODE || 'LIST') as ViewMode,
  },
  
  // Default values
  defaults: {
    userRole: (process.env.DEFAULT_USER_ROLE || 'CLIENT') as UserRole,
    interestType: (process.env.DEFAULT_INTEREST_TYPE || 'VIEWED') as InterestType,
    savedPropertyNotes: process.env.DEFAULT_SAVED_PROPERTY_NOTES || '',
    userActive: process.env.DEFAULT_USER_ACTIVE !== 'false', // true by default
    userVerified: process.env.DEFAULT_USER_VERIFIED === 'true', // false by default unless explicitly set
  },
  
  // Computed properties
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
  
  get isProduction() {
    return this.NODE_ENV === 'production';
  },
  
  get isTest() {
    return this.NODE_ENV === 'test';
  },
} as const;

export type Config = typeof config;
