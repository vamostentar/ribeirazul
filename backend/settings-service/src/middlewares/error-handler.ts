import { dependencyConfig } from '@/config/dependency-config';
import { ERROR_CODES, HTTP_STATUS, SettingsError } from '@/types/common';
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Middleware de tratamento de erros
 * Centraliza o tratamento de erros da aplicação
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { observability } = dependencyConfig;

  // Log do erro
  observability.error('Erro capturado pelo middleware', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  });

  // Determinar status code e código de erro
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode: string = ERROR_CODES.INTERNAL_ERROR;
  let message: string = 'Erro interno do servidor';

  if (error instanceof SettingsError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    
    // Mapear status codes para códigos de erro
    switch (statusCode) {
      case HTTP_STATUS.BAD_REQUEST:
        errorCode = ERROR_CODES.VALIDATION_ERROR;
        message = 'Dados inválidos';
        break;
      case HTTP_STATUS.UNAUTHORIZED:
        errorCode = ERROR_CODES.UNAUTHORIZED;
        message = 'Não autorizado';
        break;
      case HTTP_STATUS.FORBIDDEN:
        errorCode = ERROR_CODES.FORBIDDEN;
        message = 'Acesso negado';
        break;
      case HTTP_STATUS.NOT_FOUND:
        errorCode = ERROR_CODES.NOT_FOUND;
        message = 'Recurso não encontrado';
        break;
      case HTTP_STATUS.CONFLICT:
        errorCode = ERROR_CODES.CONFLICT;
        message = 'Conflito de dados';
        break;
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        errorCode = ERROR_CODES.VALIDATION_ERROR;
        message = 'Dados não processáveis';
        break;
      default:
        errorCode = ERROR_CODES.INTERNAL_ERROR;
        message = 'Erro interno do servidor';
    }
  } else if (error.validation) {
    // Erro de validação do Fastify
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = 'Dados de entrada inválidos';
  }

  // Resposta de erro padronizada
  const errorResponse = {
    success: false,
    error: message,
    code: errorCode,
    timestamp: new Date().toISOString(),
    path: request.url,
    method: request.method,
  };

  // Adicionar detalhes de validação se disponíveis
  if (error.validation) {
    (errorResponse as any).details = error.validation;
  }

  // Adicionar stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    (errorResponse as any).stack = error.stack;
  }

  return reply.status(statusCode).send(errorResponse);
}

/**
 * Middleware de tratamento de erros não capturados
 */
export function setupUnhandledErrorHandlers(): void {
  const { observability } = dependencyConfig;

  // Capturar erros não tratados
  process.on('uncaughtException', (error) => {
    observability.error('Erro não capturado', { error: error.message, stack: error.stack });
    
    // Em produção, encerrar o processo
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // Capturar promises rejeitadas
  process.on('unhandledRejection', (reason, promise) => {
    observability.error('Promise rejeitada não tratada', { 
      reason: reason instanceof Error ? reason.message : reason,
      promise: promise.toString(),
    });
    
    // Em produção, encerrar o processo
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // Capturar avisos de depreciação
  process.on('warning', (warning) => {
    observability.warn('Aviso do Node.js', { 
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  });
}
