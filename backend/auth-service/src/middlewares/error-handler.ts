import {
    AuthError
} from '@/types/common';
import { logger } from '@/utils/logger';
import { getRequestContext, getRequestDuration } from '@/utils/request-context';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Global error handler for Fastify
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const context = getRequestContext(request);
  const requestId = context?.requestId || 'unknown';
  const duration = context ? getRequestDuration(context) : 0;
  
  // Base error response
  const baseResponse = {
    success: false,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      duration,
    },
  };

  // 1. Validation Errors (Zod)
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    logger.warn({
      requestId,
      method: request.method,
      url: request.url,
      validationErrors,
    }, 'Validation error');

    return reply.code(400).send({
      ...baseResponse,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: validationErrors,
      },
    });
  }

  // 2. Custom Auth Errors
  if (error instanceof AuthError) {
    const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
    
    logger[logLevel]({
      requestId,
      method: request.method,
      url: request.url,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      },
      userId: context?.userId,
    }, `Auth error: ${error.message}`);

    return reply.code(error.statusCode).send({
      ...baseResponse,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    });
  }

  // 3. Fastify Validation Errors
  if (error.validation) {
    logger.warn({
      requestId,
      method: request.method,
      url: request.url,
      validation: error.validation,
    }, 'Fastify validation error');

    return reply.code(400).send({
      ...baseResponse,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Invalid request data',
        details: error.validation,
      },
    });
  }

  // 4. JWT Errors
  if (error.code?.startsWith('FST_JWT_')) {
    let message = 'Authentication failed';
    let code = 'UNAUTHORIZED';

    switch (error.code) {
      case 'FST_JWT_NO_AUTHORIZATION_IN_HEADER':
        message = 'Authorization header is required';
        break;
      case 'FST_JWT_AUTHORIZATION_TOKEN_INVALID':
        message = 'Invalid or expired token';
        break;
      case 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED':
        message = 'Token has expired';
        code = 'TOKEN_EXPIRED';
        break;
      case 'FST_JWT_AUTHORIZATION_TOKEN_UNTRUSTED':
        message = 'Token is not trusted';
        break;
    }

    logger.warn({
      requestId,
      method: request.method,
      url: request.url,
      jwtError: error.code,
      userId: context?.userId,
    }, 'JWT authentication error');

    return reply.code(401).send({
      ...baseResponse,
      error: {
        code,
        message,
      },
    });
  }

  // 5. Rate Limiting Errors
  if (error.statusCode === 429) {
    logger.warn({
      requestId,
      method: request.method,
      url: request.url,
      ipAddress: context?.ipAddress,
    }, 'Rate limit exceeded');

    return reply.code(429).send({
      ...baseResponse,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  }

  // 6. Database/Prisma Errors
  if (error.message?.includes('Prisma') || error.code?.startsWith('P')) {
    logger.error({
      requestId,
      method: request.method,
      url: request.url,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
      },
    }, 'Database error');

    // Don't expose internal database errors to clients
    return reply.code(500).send({
      ...baseResponse,
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
      },
    });
  }

  // 7. Network/Connection Errors
  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code!)) {
    logger.error({
      requestId,
      method: request.method,
      url: request.url,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
      },
    }, 'Network connection error');

    return reply.code(503).send({
      ...baseResponse,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'External service temporarily unavailable',
      },
    });
  }

  // 8. File Upload Errors
  if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
    return reply.code(413).send({
      ...baseResponse,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds the maximum allowed limit',
      },
    });
  }

  // 9. CORS Errors
  if (error.code === 'FST_CORS_INVALID_ORIGIN') {
    logger.warn({
      requestId,
      method: request.method,
      url: request.url,
      origin: request.headers.origin,
    }, 'CORS error: Invalid origin');

    return reply.code(403).send({
      ...baseResponse,
      error: {
        code: 'CORS_ERROR',
        message: 'Origin not allowed',
      },
    });
  }

  // 10. Generic HTTP Errors
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    logger.warn({
      requestId,
      method: request.method,
      url: request.url,
      statusCode: error.statusCode,
      error: error.message,
    }, 'Client error');

    return reply.code(error.statusCode).send({
      ...baseResponse,
      error: {
        code: `HTTP_${error.statusCode}`,
        message: error.message || 'Client error',
      },
    });
  }

  // 11. Internal Server Errors (500+)
  logger.error({
    requestId,
    method: request.method,
    url: request.url,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    },
    userId: context?.userId,
  }, 'Internal server error');

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return reply.code(error.statusCode || 500).send({
    ...baseResponse,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred',
      ...(isDevelopment && {
        details: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    },
  });
}

/**
 * Not found handler
 */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  const context = getRequestContext(request);
  const requestId = context?.requestId || 'unknown';

  logger.warn({
    requestId,
    method: request.method,
    url: request.url,
  }, 'Route not found');

  return reply.code(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

/**
 * Create error response helper
 */
export function createErrorResponse(
  error: AuthError,
  requestId?: string
) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: requestId || 'unknown',
    },
  };
}

/**
 * Create success response helper
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string,
  meta?: Record<string, any>
) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: requestId || 'unknown',
      ...meta,
    },
  };
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends any[]>(
  fn: (...args: T) => Promise<any>
) {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw the error to be handled by the global error handler
      throw error;
    }
  };
}


