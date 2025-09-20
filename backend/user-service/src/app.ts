import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { httpLogger, logger, logHelpers } from './utils/logger';
import { createRequestContext } from './utils/request-context';

export async function createApp() {
  // Initialize Prisma
  const prisma = new PrismaClient({
    datasourceUrl: config.databaseConfig.url,
    log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  });

  // Create Fastify instance
  const app = Fastify({
    logger: config.NODE_ENV === 'production' 
      ? { level: config.LOG_LEVEL }
      : httpLogger,
    disableRequestLogging: config.NODE_ENV === 'production',
    trustProxy: config.TRUST_PROXY,
    requestIdLogLabel: 'requestId',
    genReqId: () => crypto.randomUUID(),
  });

  // Global error handler
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Security middleware
  if (config.HELMET_ENABLED) {
    await app.register(import('@fastify/helmet'), {
      global: true,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: config.cspConfig.defaultSrc,
          styleSrc: config.cspConfig.styleSrc,
          scriptSrc: config.cspConfig.scriptSrc,
          imgSrc: config.cspConfig.imgSrc,
        },
      },
    });
  }

  // CORS configuration
  await app.register(import('@fastify/cors'), {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: config.corsAllowedHeaders,
  });

  // Rate limiting
  await app.register(import('@fastify/rate-limit'), {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Try again later.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.requestContext?.requestId,
        expiresIn: context.ttl,
      },
    }),
  });

  // System monitoring
  await app.register(import('@fastify/under-pressure'), {
    maxEventLoopDelay: config.systemLimits.maxEventLoopDelay,
    maxHeapUsedBytes: config.systemLimits.maxHeapUsedBytes,
    maxRssBytes: config.systemLimits.maxRssBytes,
    maxEventLoopUtilization: config.systemLimits.maxEventLoopUtilization,
    message: config.systemLimits.pressureMessage,
    retryAfter: config.systemLimits.retryAfter,
    pressureHandler: (req, rep, type, value) => {
      logger.warn({
        type,
        value,
        url: req.url,
        method: req.method,
        requestId: req.requestContext?.requestId,
      }, 'System under pressure');
      
      rep.code(503).send({
        success: false,
        error: {
          code: 'SERVICE_OVERLOADED',
          message: 'Service temporarily overloaded',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestContext?.requestId,
        },
      });
    },
  });

  // Swagger documentation
  if (config.SWAGGER_ENABLED) {
    await app.register(import('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: config.API_TITLE,
          description: config.API_DESCRIPTION,
          version: config.API_VERSION,
          contact: {
            name: config.API_CONTACT_NAME,
            email: config.API_CONTACT_EMAIL,
          },
        },
        servers: [
          {
            url: `http://localhost:${config.PORT}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            apiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
            },
          },
        },
        tags: [
          { name: 'User Profiles', description: 'User profile management endpoints' },
          { name: 'User Preferences', description: 'User preferences endpoints' },
          { name: 'Property Interests', description: 'Property interest tracking endpoints' },
          { name: 'Saved Properties', description: 'Saved properties management endpoints' },
          { name: 'Search History', description: 'Search history endpoints' },
          { name: 'Notifications', description: 'User notifications endpoints' },
          { name: 'Health', description: 'Health check endpoints' },
        ],
      },
    });

    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
    });
  }

  // Add Prisma to Fastify instance
  app.decorate('prisma', prisma);

  // Connect to database
  try {
    await prisma.$connect();
    logHelpers.databaseConnection('connected');
  } catch (error) {
    logHelpers.databaseConnection('error', error as Error);
    throw error;
  }

  // Health check route
  app.get('/health', async (request, reply) => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        services: {
          database: 'connected',
          redis: config.redisConfig ? 'configured' : 'not_configured',
        },
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: 'disconnected',
          redis: config.redisConfig ? 'unknown' : 'not_configured',
        },
      };
    }
  });

  // Root route
  app.get('/', async (request, reply) => {
    const baseInfo = {
      name: config.API_TITLE,
      version: process.env.npm_package_version || '1.0.0',
      description: config.API_DESCRIPTION,
      timestamp: new Date().toISOString(),
      health: '/health',
    };

    // Only expose detailed config in development
    if (config.NODE_ENV !== 'production') {
      return {
        ...baseInfo,
        environment: config.NODE_ENV,
        documentation: config.SWAGGER_ENABLED ? '/docs' : 'disabled',
        endpoints: {
          health: '/health',
          users: '/api/v1/user-profiles',
          preferences: '/api/v1/user-preferences',
        }
      };
    }

    return baseInfo;
  });

  // Register route modules
  const { registerRoutes } = await import('./routes');
  await registerRoutes(app);

  // Add request context hook globally
  app.addHook('onRequest', async (request, reply) => {
    request.requestContext = createRequestContext(request);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`🛑 Received ${signal}, shutting down gracefully`);
    
    try {
      await prisma.$disconnect();
      logHelpers.databaseConnection('disconnected');
      
      await app.close();
      logger.info('✅ Server closed successfully');
      process.exit(0);
    } catch (error: any) {
      logger.error({ err: error }, '❌ Error during shutdown:');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return app;
}
