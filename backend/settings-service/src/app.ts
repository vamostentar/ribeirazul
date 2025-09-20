import { config, dependencyConfig } from '@/config';
import { errorHandler, setupUnhandledErrorHandlers } from '@/middlewares/error-handler';
import { corsMiddleware, maintenanceMiddleware, rateLimitMiddleware, requestContextMiddleware, securityMiddleware } from '@/middlewares/request-context.middleware';
import { registerRoutes } from '@/routes';
import Fastify, { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Cria e configura a aplicação Fastify
 */
export async function createApp() {
  // Configurar tratamento de erros não capturados
  setupUnhandledErrorHandlers();

  // Criar instância do Fastify
  const fastify = Fastify({
    logger: config.config.LOG_FORMAT === 'pretty' ? {
      level: config.config.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    } : {
      level: config.config.LOG_LEVEL,
    },
    trustProxy: true,
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => generateRequestId(),
  });

  // Registrar plugins do Fastify
  await registerPlugins(fastify);

  // Registrar middlewares
  await registerMiddlewares(fastify);

  // Registrar rotas
  await registerRoutes(fastify);

  // Configurar tratamento de erros
  fastify.setErrorHandler(errorHandler);

  // Configurar hooks de ciclo de vida
  setupLifecycleHooks(fastify);

  return fastify;
}

/**
 * Registra plugins do Fastify
 */
async function registerPlugins(fastify: FastifyInstance) {
  // CORS
  if (config.config.ENABLE_CORS) {
    await fastify.register(require('@fastify/cors'), {
      origin: config.config.CORS_ORIGIN?.split(',') || 
              (process.env.API_URL ? [process.env.API_URL] : ['http://localhost:3001']),
      credentials: true,
    });
  }

  // Helmet (segurança)
  if (config.config.ENABLE_HELMET) {
    await fastify.register(require('@fastify/helmet'), {
      contentSecurityPolicy: false, // Desabilitar CSP para desenvolvimento
    });
  }

  // Rate limiting
  if (config.config.ENABLE_RATE_LIMIT) {
    await fastify.register(require('@fastify/rate-limit'), {
      max: config.config.RATE_LIMIT_MAX,
      timeWindow: config.config.RATE_LIMIT_WINDOW,
      errorResponseBuilder: (request: FastifyRequest, context: any) => ({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(context.ttl / 1000),
      }),
    });
  }

  // Under pressure (proteção contra sobrecarga)
  await fastify.register(require('@fastify/under-pressure'), {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 500 * 1024 * 1024, // 500MB
    maxRssBytes: 800 * 1024 * 1024, // 800MB
    maxEventLoopUtilization: 0.98,
    pressureHandler: (request: FastifyRequest, reply: FastifyReply, type: string, value: number) => {
      dependencyConfig.observability.warn('Sistema sob pressão', { type, value });

      reply.status(503).send({
        success: false,
        error: 'Service temporarily unavailable',
        code: 'SERVICE_OVERLOADED',
        retryAfter: 30,
      });
    },
  });

  // Swagger (documentação da API)
  if (config.config.SWAGGER_ENABLED) {
    await fastify.register(require('@fastify/swagger'), {
      openapi: {
        info: {
          title: config.config.API_TITLE,
          description: config.config.API_DESCRIPTION,
          version: config.config.API_VERSION,
        },
        servers: [
          {
            url: `http://localhost:${config.config.PORT}`,
            description: 'Development server',
          },
        ],
        tags: [
          { name: 'Settings', description: 'Configurações do sistema' },
          { name: 'Module Settings', description: 'Configurações de módulos' },
          { name: 'Health', description: 'Health checks e monitoramento' },
        ],
      },
    });

    await fastify.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      uiHooks: {
        onRequest: function (request: FastifyRequest, reply: FastifyReply, next: () => void) {
          next();
        },
        preHandler: function (request: FastifyRequest, reply: FastifyReply, next: () => void) {
          next();
        },
      },
      staticCSP: true,
      transformStaticCSP: (header: string) => header,
      transformSpecification: (swaggerObject: any, request: FastifyRequest, reply: FastifyReply) => {
        return swaggerObject;
      },
      transformSpecificationClone: true,
    });
  }
}

/**
 * Registra middlewares
 */
async function registerMiddlewares(fastify: FastifyInstance) {
  // Middleware de contexto de requisição
  fastify.addHook('preHandler', requestContextMiddleware);

  // Middleware de segurança
  fastify.addHook('preHandler', securityMiddleware);

  // Middleware de CORS personalizado
  fastify.addHook('preHandler', corsMiddleware);

  // Middleware de rate limiting personalizado
  fastify.addHook('preHandler', rateLimitMiddleware);

  // Middleware de verificação de manutenção
  fastify.addHook('preHandler', maintenanceMiddleware);
}

/**
 * Configura hooks de ciclo de vida
 */
function setupLifecycleHooks(fastify: FastifyInstance) {
  // Hook de inicialização
  fastify.addHook('onReady', async () => {
    dependencyConfig.observability.info('Aplicação pronta para receber requisições');
    
    // Inicializar dependências
    try {
      await dependencyConfig.initialize();
      dependencyConfig.observability.info('Dependências inicializadas com sucesso');
    } catch (error) {
      dependencyConfig.observability.error('Erro ao inicializar dependências', { error });
      throw error;
    }
  });

  // Hook de encerramento
  fastify.addHook('onClose', async () => {
    dependencyConfig.observability.info('Encerrando aplicação...');
    
    try {
      await dependencyConfig.shutdown();
      dependencyConfig.observability.info('Aplicação encerrada com sucesso');
    } catch (error) {
      dependencyConfig.observability.error('Erro ao encerrar aplicação', { error });
    }
  });

  // Hook de erro não tratado
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: FastifyError) => {
    dependencyConfig.observability.error('Erro não tratado', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });
  });
}

/**
 * Gera ID único para requisição
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
