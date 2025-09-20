import { UserServiceError } from '@/types/common';
import { logger } from '@/utils/logger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Middleware de tratamento de erros
 * Segue o padrão black box - esconde detalhes de implementação
 */
export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.requestContext?.requestId || 'unknown';
  
  // Log do erro
  logger.error({
    err: error,
    requestId,
    url: request.url,
    method: request.method,
  }, 'Request error');

  // Erro de validação Zod
  if (error instanceof ZodError) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: (err as any).input,
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  // Erro do serviço
  if (error instanceof UserServiceError) {
    return reply.code(400).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  // Erro de banco de dados
  if (error.message.includes('Unique constraint')) {
    return reply.code(409).send({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Resource already exists',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  if (error.message.includes('Record to update not found')) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  // Erro genérico
  return reply.code(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

/**
 * Middleware para rotas não encontradas
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.requestContext?.requestId || 'unknown';

  return reply.code(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      path: request.url,
      method: request.method,
    },
  });
}

/**
 * Middleware de validação de entrada
 */
export function validateInput<T>(schema: any) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedData = schema.parse(request.body);
      request.body = validatedData;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              value: (err as any).input,
            })),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.requestContext?.requestId,
          },
        });
      }
      throw error;
    }
  };
}

/**
 * Middleware de autenticação (placeholder)
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Em uma implementação real, isso verificaria o JWT
  // Por enquanto, apenas logamos a tentativa
  const requestId = request.requestContext?.requestId || 'unknown';
  
  logger.info({
    requestId,
    url: request.url,
    method: request.method,
  }, 'Authentication check (placeholder)');

  // Por enquanto, permitimos todas as requisições
  // Em produção, isso seria implementado com JWT
}

/**
 * Middleware de autorização (placeholder)
 */
export async function authorizationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Em uma implementação real, isso verificaria as permissões
  // Por enquanto, apenas logamos a tentativa
  const requestId = request.requestContext?.requestId || 'unknown';
  
  logger.info({
    requestId,
    url: request.url,
    method: request.method,
  }, 'Authorization check (placeholder)');

  // Por enquanto, permitimos todas as requisições
  // Em produção, isso seria implementado com RBAC
}
