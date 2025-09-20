import { z } from 'zod';

// Common response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationMeta {
  nextCursor?: string | null;
  hasMore: boolean;
  limit: number;
  totalEstimate?: number;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: PaginationMeta;
}

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: 'up' | 'down';
    cache?: 'up' | 'down';
  };
  uptime: number;
  version: string;
}

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier ${identifier} not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

// Common validation schemas
export const uuidSchema = z.string().uuid();
export const positiveNumberSchema = z.number().positive();
export const positiveIntSchema = z.number().int().positive();
export const urlSchema = z.string().url();
export const emailSchema = z.string().email();

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
