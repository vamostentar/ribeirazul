import { dependencyConfig } from '@/config/dependency-config';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Middleware de contexto de requisição
 * Adiciona informações úteis ao contexto da requisição
 */
export async function requestContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { observability } = dependencyConfig;

  // Adicionar informações básicas ao contexto
  const context = {
    requestId: generateRequestId(),
    startTime: Date.now(),
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    method: request.method,
    url: request.url,
    headers: {
      'content-type': request.headers['content-type'],
      'accept': request.headers['accept'],
      'authorization': request.headers['authorization'] ? '[REDACTED]' : undefined,
    },
  };

  // Adicionar ao request para uso posterior
  (request as any).requestContext = context;

  // Log da requisição
  observability.info('Requisição recebida', {
    requestId: context.requestId,
    method: context.method,
    url: context.url,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  // Log da resposta será feito no hook onSend do Fastify
  // (isso será implementado no app.ts)
}

/**
 * Middleware de rate limiting básico
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { observability } = dependencyConfig;

  // Implementação básica de rate limiting por IP
  const ip = request.ip;
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const maxRequests = 100; // 100 requisições por minuto

  // Em uma implementação real, isso seria feito com Redis ou similar
  // Por enquanto, apenas log para demonstração
  observability.debug('Rate limit check', {
    ip,
    windowMs,
    maxRequests,
  });

  // TODO: Implementar rate limiting real com cache
}

/**
 * Middleware de validação de manutenção
 */
export async function maintenanceMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { observability } = dependencyConfig;

  // Verificar se o sistema está em modo de manutenção
  try {
    const isMaintenanceMode = await dependencyConfig.database.settings.isMaintenanceMode();
    
    if (isMaintenanceMode && !request.url.startsWith('/health')) {
      observability.warn('Requisição bloqueada - modo de manutenção', {
        url: request.url,
        method: request.method,
        ip: request.ip,
      });

      return reply.status(503).send({
        success: false,
        error: 'Sistema em manutenção',
        code: 'MAINTENANCE_MODE',
        message: 'O sistema está temporariamente indisponível para manutenção',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Em caso de erro ao verificar manutenção, permitir requisição
    observability.warn('Erro ao verificar modo de manutenção', { error });
  }
}

/**
 * Middleware de CORS personalizado
 */
export async function corsMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const origin = request.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || 
                        (process.env.API_URL ? [process.env.API_URL] : ['http://localhost:3001']);

  if (origin && allowedOrigins.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin);
  }

  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  reply.header('Access-Control-Allow-Credentials', 'true');
}

/**
 * Middleware de segurança básica
 */
export async function securityMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Headers de segurança básicos
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remover header X-Powered-By
  reply.removeHeader('X-Powered-By');
}

/**
 * Gera ID único para requisição
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
