import { container, shutdownContainer } from '@/container-simple';
import { registerHealthRoutes } from '@/routes/health';
import { registerMessageRoutes } from '@/routes/messages';
import { registerMetricsRoutes } from '@/routes/metrics';
import { config, configService } from '@/utils/config';
import { logger } from '@/utils/logger';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
// Removed awilix-fastify - using simple container injection
import Fastify, { FastifyInstance } from 'fastify';

// Graceful shutdown handler
let server: FastifyInstance | null = null;
let isShuttingDown = false;

// Handle graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT);

  try {
    // Stop accepting new requests
    if (server) {
      logger.info('Stopping HTTP server...');
      await server.close();
    }

    // Shutdown container (closes DB, Redis, queues, etc.)
    logger.info('Shutting down services...');
    await shutdownContainer();

    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error: any) {
    clearTimeout(shutdownTimeout);
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger as any,
    trustProxy: config.TRUST_PROXY || false,
    bodyLimit: config.MAX_PAYLOAD_SIZE,
    connectionTimeout: config.REQUEST_TIMEOUT,
    keepAliveTimeout: 5000,
    maxParamLength: 200,
    disableRequestLogging: false,
    ignoreTrailingSlash: true,
  });

  // Set the container for dependency injection
  app.decorate('diContainer', container);

  // Security middleware
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: configService.isProduction ? undefined : false,
    hsts: configService.isProduction ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
  });

  // CORS configuration
  await app.register(cors, {
    origin: configService.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Correlation-ID',
      config.API_KEY_HEADER,
    ],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
      retryAfter: Math.round(context.ttl / 1000),
    }),
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });

  // Request timeout
  await app.register(async function (app) {
    app.addHook('onRequest', async (request, reply) => {
      const timeout = setTimeout(() => {
        reply.code(408).send({
          success: false,
          error: 'REQUEST_TIMEOUT',
          message: 'Request timeout',
        });
      }, config.REQUEST_TIMEOUT);

      reply.raw.on('finish', () => {
        clearTimeout(timeout);
      });
    });
  });

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    const correlationId = request.correlationId || 'unknown';
    
    // Log the error
    request.log.error(`Request error: ${error.message} (${request.method} ${request.url})`);

    // Increment error metrics
    const { metricsService } = container;
    metricsService.incrementCounter('http_errors_total', 1, {
      method: request.method,
      status_code: reply.statusCode?.toString() || '500',
    });

    // Determine error response
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.validation,
        correlationId,
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        success: false,
        error: error.code || 'CLIENT_ERROR',
        message: error.message,
        correlationId,
      });
    }

    // 500 errors - don't expose internal details in production
    return reply.code(500).send({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: configService.isProduction ? 'Internal server error' : error.message,
      correlationId,
    });
  });

  // Not found handler
  app.setNotFoundHandler(async (request, reply) => {
    const correlationId = request.correlationId || 'unknown';
    
    request.log.warn(`Route not found: ${request.method} ${request.url}`);

    const { metricsService } = container;
    metricsService.incrementCounter('http_not_found_total');

    return reply.code(404).send({
      success: false,
      error: 'NOT_FOUND',
      message: 'Route not found',
      correlationId,
    });
  });

  // Register routes
  await registerHealthRoutes(app);
  await registerMetricsRoutes(app);
  await registerMessageRoutes(app);

  // Root endpoint
  app.get('/', async () => ({
    service: 'messages-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    status: 'running',
    timestamp: new Date().toISOString(),
  }));

  // Ready hook - called when server is ready to accept requests
  app.addHook('onReady', async () => {
    logger.info('Server is ready to accept requests', {
      host: config.HOST,
      port: config.PORT,
      environment: config.NODE_ENV,
      metricsEnabled: config.METRICS_ENABLED,
      tracingEnabled: config.TRACING_ENABLED,
    });

    // Background services can be started here if needed
    logger.info('Background services initialization skipped for now');
  });

  return app;
}

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  buildServer()
    .then(async (app) => {
      server = app;
      const address = await app.listen({ 
        host: config.HOST, 
        port: config.PORT 
      });
      
      logger.info('🚀 Messages Service started successfully', {
        address,
        environment: config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        features: {
          metrics: config.METRICS_ENABLED,
          tracing: config.TRACING_ENABLED,
          redis: !!config.REDIS_URL,
          queue: !!config.REDIS_URL,
        },
      });
      
      return address;
    })
    .catch((err) => {
      logger.fatal('Failed to start server', { 
        error: err.message, 
        stack: err.stack,
        name: err.name 
      });
      console.error('Full error object:', err);
      process.exit(1);
    });
}

// Extend Fastify interface to include our container
declare module 'fastify' {
  interface FastifyInstance {
    diContainer: import('@/container-simple').SimpleContainer;
  }
  interface FastifyRequest {
    correlationId?: string;
  }
}


