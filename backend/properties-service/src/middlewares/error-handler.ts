import { Prisma } from '@prisma/client';
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { config } from '../config/index';
import { AppError } from '../types/common';
import { logError, logValidationError } from '../utils/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.id;
  const method = request.method;
  const url = request.url;
  
  // Log all errors
  logError(error, `${method} ${url} - Request ID: ${requestId}`);
  
  // Handle different error types
  
  // 1. Custom Application Errors
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 2. Zod Validation Errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: (err as any).received || 'unknown',
    }));
    
    logValidationError(validationErrors, `${method} ${url}`);
    
    return reply.code(400).send({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: validationErrors,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 3. Fastify Validation Errors
  if (error.validation) {
    const validationErrors = error.validation.map((err: any) => ({
      field: err.instancePath?.replace('/', '') || err.schemaPath,
      message: err.message,
      received: err.data,
    }));
    
    logValidationError(validationErrors, `${method} ${url}`);
    
    return reply.code(400).send({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: validationErrors,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 4. Prisma Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return reply.code(409).send({
          error: 'Resource already exists',
          code: 'DUPLICATE_RESOURCE',
          details: {
            target: error.meta?.target,
          },
          requestId,
          timestamp: new Date().toISOString(),
        });
        
      case 'P2025': // Record not found
        return reply.code(404).send({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          requestId,
          timestamp: new Date().toISOString(),
        });
        
      case 'P2003': // Foreign key constraint violation
        return reply.code(400).send({
          error: 'Invalid reference to related resource',
          code: 'FOREIGN_KEY_VIOLATION',
          details: {
            field: error.meta?.field_name,
          },
          requestId,
          timestamp: new Date().toISOString(),
        });
        
      case 'P2014': // Invalid ID
        return reply.code(400).send({
          error: 'Invalid identifier provided',
          code: 'INVALID_ID',
          requestId,
          timestamp: new Date().toISOString(),
        });
        
      default:
        // Log unknown Prisma errors
        logError(error, `Unknown Prisma error: ${error.code}`);
        break;
    }
  }
  
  // 5. Prisma Client Validation Errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return reply.code(400).send({
      error: 'Database validation error',
      code: 'DB_VALIDATION_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 6. Database Connection Errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return reply.code(503).send({
      error: 'Database connection error',
      code: 'DB_CONNECTION_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 7. Rate Limiting Errors
  if (error.statusCode === 429) {
    return reply.code(429).send({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 8. HTTP Client Errors (4xx)
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.code(error.statusCode).send({
      error: error.message,
      code: error.code || 'CLIENT_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 9. Default Internal Server Error
  const message = config.isProduction 
    ? 'Internal Server Error' 
    : error.message;
    
  return reply.code(500).send({
    error: message,
    code: 'INTERNAL_ERROR',
    requestId,
    timestamp: new Date().toISOString(),
    ...(config.isDevelopment && {
      stack: error.stack,
      details: {
        name: error.name,
        message: error.message,
      },
    }),
  });
}
