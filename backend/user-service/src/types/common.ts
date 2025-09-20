/**
 * Tipos comuns utilizados em todo o sistema
 */

// Result wrapper para operações que podem falhar
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

// Opções de paginação
export interface PaginationOptions {
  page: number;
  limit: number;
  skip?: number;
  take?: number;
}

// Resultado paginado
export interface PaginatedResult<T> {
  items: T[];
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
export interface SearchFilters {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isActive?: boolean;
  [key: string]: any;
}

// Opções de ordenação
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Contexto de requisição
export interface RequestContext {
  requestId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  correlationId?: string;
}

// Validação de entrada
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Health check
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

// Error types
export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export class UserServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

// Event types para comunicação entre serviços
export interface UserEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | 'user.verified';
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface NotificationEvent {
  type: 'notification.created' | 'notification.sent' | 'notification.read';
  notificationId: string;
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  USER_PREFERENCES: (userId: string) => `user:preferences:${userId}`,
  USER_NOTIFICATIONS: (userId: string) => `user:notifications:${userId}`,
  USER_INTERESTS: (userId: string) => `user:interests:${userId}`,
  USER_SAVED_PROPERTIES: (userId: string) => `user:saved:${userId}`,
  USER_SEARCH_HISTORY: (userId: string) => `user:search:${userId}`,
  POPULAR_SEARCHES: () => 'popular:searches',
  HEALTH_STATUS: () => 'health:status',
} as const;

// Rate limiting
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// External service integration
export interface ExternalServiceConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  apiKey?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    service: string;
    version?: string;
  };
}
