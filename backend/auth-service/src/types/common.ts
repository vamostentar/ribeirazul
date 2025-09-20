import { z } from 'zod';

// =====================================================
// COMMON ERROR TYPES
// =====================================================

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AuthError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AuthError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AuthError {
  constructor(message: string = 'Resource already exists', details?: any) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends AuthError {
  constructor(message: string = 'Too many requests', details?: any) {
    super(message, 'TOO_MANY_REQUESTS', 429, details);
    this.name = 'TooManyRequestsError';
  }
}

export class ServiceUnavailableError extends AuthError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(message, 'SERVICE_UNAVAILABLE', 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

// =====================================================
// PAGINATION TYPES
// =====================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export interface PaginatedResponse<T> {
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

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    redis?: 'connected' | 'disconnected' | 'error';
    email?: 'configured' | 'not_configured' | 'error';
  };
  metrics?: {
    memoryUsage: NodeJS.MemoryUsage;
    activeConnections: number;
    activeSessions: number;
    requestsPerMinute: number;
  };
}

// =====================================================
// REQUEST CONTEXT TYPES
// =====================================================

export interface RequestContext {
  requestId: string;
  correlationId?: string;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  startTime: number;
  endpoint?: string;
  method?: string;
}

// =====================================================
// AUDIT LOG TYPES
// =====================================================

export enum AuditAction {
  // Authentication actions
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  LOGIN_FAILED = 'auth.login_failed',
  PASSWORD_CHANGED = 'auth.password_changed',
  PASSWORD_RESET_REQUESTED = 'auth.password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'auth.password_reset_completed',
  
  // Two-factor authentication
  TWO_FACTOR_ENABLED = 'auth.2fa_enabled',
  TWO_FACTOR_DISABLED = 'auth.2fa_disabled',
  TWO_FACTOR_VERIFIED = 'auth.2fa_verified',
  TWO_FACTOR_FAILED = 'auth.2fa_failed',
  
  // User management
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ACTIVATED = 'user.activated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_ROLE_CHANGED = 'user.role_changed',
  
  // Role management
  ROLE_CREATED = 'role.created',
  ROLE_UPDATED = 'role.updated',
  ROLE_DELETED = 'role.deleted',
  
  // Session management
  SESSION_CREATED = 'session.created',
  SESSION_TERMINATED = 'session.terminated',
  SESSION_EXPIRED = 'session.expired',
  
  // Security events
  ACCOUNT_LOCKED = 'security.account_locked',
  ACCOUNT_UNLOCKED = 'security.account_unlocked',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  TOKEN_BLACKLISTED = 'security.token_blacklisted',
  
  // API Key management
  API_KEY_CREATED = 'api_key.created',
  API_KEY_DELETED = 'api_key.deleted',
  API_KEY_USED = 'api_key.used',
  
  // System events
  SYSTEM_SETTINGS_UPDATED = 'system.settings_updated',
  SYSTEM_BACKUP_CREATED = 'system.backup_created',
  SYSTEM_MAINTENANCE = 'system.maintenance',
}

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

// =====================================================
// PERMISSION TYPES
// =====================================================

export enum PermissionEnum {
  // User management
  USERS_READ = 'users.read',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_DELETE = 'users.delete',
  USERS_ACTIVATE = 'users.activate',
  USERS_DEACTIVATE = 'users.deactivate',
  
  // Role management
  ROLES_READ = 'roles.read',
  ROLES_CREATE = 'roles.create',
  ROLES_UPDATE = 'roles.update',
  ROLES_DELETE = 'roles.delete',
  
  // Session management
  SESSIONS_READ = 'sessions.read',
  SESSIONS_TERMINATE = 'sessions.terminate',
  SESSIONS_MANAGE_ALL = 'sessions.manage_all',
  
  // Audit logs
  AUDIT_LOGS_READ = 'audit_logs.read',
  AUDIT_LOGS_EXPORT = 'audit_logs.export',
  
  // System settings
  SETTINGS_READ = 'settings.read',
  SETTINGS_UPDATE = 'settings.update',
  
  // API Keys
  API_KEYS_READ = 'api_keys.read',
  API_KEYS_CREATE = 'api_keys.create',
  API_KEYS_DELETE = 'api_keys.delete',
  
  // Analytics and monitoring
  ANALYTICS_READ = 'analytics.read',
  SYSTEM_HEALTH_READ = 'system.health.read',
  
  // Super admin permissions
  SYSTEM_ADMIN = 'system.admin',
  ALL_PERMISSIONS = '*',
}

// =====================================================
// RATE LIMITING TYPES
// =====================================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (request: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

export const EmailSchema = z.string().email('Invalid email format');
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const PhoneSchema = z.string()
  .min(8, 'Phone number must be at least 8 characters')
  .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format');

export const UUIDSchema = z.string().uuid('Invalid UUID format');

// =====================================================
// UTILITY TYPES
// =====================================================

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Partial<T> = { [P in keyof T]?: T[P] };
export type Required<T> = { [P in keyof T]-?: T[P] };

export interface TimestampFields {
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditFields extends TimestampFields {
  createdBy?: string;
  updatedBy?: string;
}

// =====================================================
// PERMISSION TYPES
// =====================================================

export type Permission = string;

// =====================================================
// PAGINATION TYPES
// =====================================================

// Removed duplicate interface Pagination (use type above)

export interface PaginatedResponse<T> {
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

// =====================================================
// FASTIFY EXTENSIONS
// =====================================================

declare module 'fastify' {
  interface FastifyRequest {
    requestContext?: RequestContext | undefined;
    user: any;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (permissions: Permission[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    prisma: any; // PrismaClient instance
  }
}
