import { RequestContext } from '@/types/common';
import { FastifyRequest } from 'fastify';

/**
 * Utilitários para contexto de requisição
 * Segue o padrão black box - esconde detalhes de implementação
 */
export function createRequestContext(request: FastifyRequest): RequestContext {
  const requestId = request.id || crypto.randomUUID();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers['user-agent'] || '';
  const correlationId = request.headers['x-correlation-id'] as string;

  return {
    requestId,
    ipAddress,
    userAgent,
    timestamp: new Date(),
    correlationId,
  };
}

/**
 * Extrai IP do cliente considerando proxies
 */
function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  const realIp = request.headers['x-real-ip'];
  
  if (forwarded) {
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return forwardedStr ? forwardedStr.split(',')[0]?.trim() || 'unknown' : 'unknown';
  }
  
  if (realIp) {
    const realIpStr = Array.isArray(realIp) ? realIp[0] : realIp;
    return realIpStr || 'unknown';
  }
  
  return request.ip || 'unknown';
}

/**
 * Middleware para adicionar contexto à requisição
 */
export function requestContextMiddleware(request: FastifyRequest, reply: any, done: () => void) {
  request.requestContext = createRequestContext(request);
  done();
}

/**
 * Extrai ID do utilizador do token JWT (se disponível)
 */
export function extractUserIdFromRequest(request: FastifyRequest): string | undefined {
  try {
    // Em uma implementação real, isso seria extraído do JWT
    // Por enquanto, retornamos undefined
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Valida se o utilizador tem permissão para acessar o recurso
 */
export function hasPermission(userId: string, resource: string, action: string): boolean {
  // Em uma implementação real, isso verificaria as permissões do utilizador
  // Por enquanto, retornamos true para todos
  return true;
}

/**
 * Gera ID único para correlação
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Adiciona headers de correlação à resposta
 */
export function addCorrelationHeaders(reply: any, requestContext: RequestContext): void {
  reply.header('X-Request-ID', requestContext.requestId);
  
  if (requestContext.correlationId) {
    reply.header('X-Correlation-ID', requestContext.correlationId);
  }
}
