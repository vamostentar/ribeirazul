/**
 * Tipos comuns para o Settings Service
 */

// Resultado de operação
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Paginação
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filtros de busca
export interface SearchOptions {
  query?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Health check
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    cache?: ServiceHealth;
    storage?: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

// Métricas
export interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  settings: {
    totalUpdates: number;
    lastUpdate: string;
    activeModules: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

// Configuração de cache
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize?: number;
  strategy?: 'lru' | 'fifo' | 'ttl';
}

// Configuração de logging
export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'pretty';
  enableAudit: boolean;
  enableMetrics: boolean;
}

// Configuração de segurança
export interface SecurityConfig {
  enableRateLimit: boolean;
  rateLimitMax: number;
  rateLimitWindow: number;
  enableCORS: boolean;
  corsOrigins: string[];
  enableHelmet: boolean;
}

// Configuração de banco de dados
export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  enableLogging: boolean;
}

// Configuração de Redis
export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  ttl: number;
  maxRetries: number;
  retryDelay: number;
}

// Erro customizado
export class SettingsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'SettingsError';
  }
}

// Constantes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;
