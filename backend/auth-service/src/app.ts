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
    logger: httpLogger,
    trustProxy: config.TRUST_PROXY,
    requestIdLogLabel: 'requestId',
    genReqId: () => crypto.randomUUID(),
  });

  // Global error handler
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Request context middleware will be registered after routes

  // Security middleware
  if (config.HELMET_ENABLED) {
    await app.register(import('@fastify/helmet'), {
      global: true,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    });
  }

  // CORS configuration
  await app.register(import('@fastify/cors'), {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-API-Key',
    ],
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
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 1000000000, // 1GB
    maxRssBytes: 1000000000, // 1GB
    maxEventLoopUtilization: 0.98,
    message: 'Under pressure!',
    retryAfter: 50,
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

  // JWT authentication
  const { default: jwtPlugin } = await import('@fastify/jwt');
  await app.register(jwtPlugin as any, {
    secret: config.jwtConfig.secret,
    sign: {
      expiresIn: config.jwtConfig.accessExpiry,
      issuer: config.jwtConfig.issuer,
      audience: config.jwtConfig.audience,
    },
    verify: {
      issuer: config.jwtConfig.issuer,
      audience: config.jwtConfig.audience,
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
            name: 'Ribeira Azul Team',
            email: 'tech@ribeirazul.com',
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
          { name: 'Authentication', description: 'Authentication endpoints' },
          { name: 'Users', description: 'User management endpoints' },
          { name: 'Roles', description: 'Role management endpoints' },
          { name: 'Sessions', description: 'Session management endpoints' },
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

  // Temporary endpoint to create admin user (development only)
  if (config.isDevelopment) {
    app.post('/dev/create-admin', async (request, reply) => {
      try {
        const { hashPassword } = await import('./utils/crypto');
        
        // Check if admin user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: config.DEFAULT_ADMIN_EMAIL }
        });
        
        if (existingUser) {
          return reply.send({
            success: true,
            message: 'Admin user already exists',
            email: existingUser.email
          });
        }
        
        // Create super admin role if it doesn't exist
        const superAdminRole = await prisma.role.upsert({
          where: { name: 'super_admin' },
          update: {},
          create: {
            name: 'super_admin',
            displayName: 'Super Administrator',
            description: 'Full system access with all permissions',
            permissions: ['*'],
            isActive: true,
          },
        });
        
        // Create admin user
        const adminPassword = config.DEFAULT_ADMIN_PASSWORD;
        const hashedPassword = await hashPassword(adminPassword);
        const adminUser = await prisma.user.create({
          data: {
            email: config.DEFAULT_ADMIN_EMAIL,
            firstName: 'System',
            lastName: 'Administrator',
            password: hashedPassword,
            isActive: true,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            roleId: superAdminRole.id,
          },
        });
        
        return reply.send({
          success: true,
          message: 'Admin user created successfully',
          email: adminUser.email,
          // Don't expose password in response
        });
        
      } catch (error) {
        console.error('Error creating admin user:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // Health check route (no schema to avoid Zod serializer)
  app.get('/health', async (request, reply) => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        version: config.API_VERSION,
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

  // Root route (no schema)
  app.get('/', async (request, reply) => {
    return {
      name: config.API_TITLE,
      version: config.API_VERSION,
      description: config.API_DESCRIPTION,
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      documentation: config.SWAGGER_ENABLED ? '/docs' : 'disabled',
      health: '/health',
    };
  });

  // Add request context hook globally (must be before routes)
  app.addHook('onRequest', async (request, reply) => {
    console.log('🔍 Global onRequest hook - creating context for:', request.url);
    request.requestContext = createRequestContext(request);
    console.log('🔍 Global onRequest hook - context created:', request.requestContext?.requestId);
  });

  // Register route modules
  const { authRoutes, userRoutes, roleRoutes, sessionRoutes } = await import('./routes');
  
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(roleRoutes, { prefix: '/api/v1/roles' });
  await app.register(sessionRoutes, { prefix: '/api/v1/sessions' });

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
