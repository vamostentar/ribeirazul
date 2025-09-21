import Fastify from 'fastify';
import { config } from './config.js';
import { authenticateJWT } from './middleware/auth.middleware.js';
import { setupProxy } from './proxy.js';

export async function createApp() {
  const app = Fastify({
    logger: config.NODE_ENV === 'production' 
      ? { level: config.LOG_LEVEL }
      : {
          level: config.LOG_LEVEL,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
            },
          },
        },
    // Disable automatic multipart processing to let proxy handle it
    disableRequestLogging: config.NODE_ENV === 'production',
    ignoreTrailingSlash: true,
    bodyLimit: 50 * 1024 * 1024, // 50MB limit for file uploads
  });

  // CORS
  await app.register(import('@fastify/cors'), {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-API-Key',
      'Accept',
      'Origin',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400, // 24 hours
  });

  // DISABLE multipart processing completely - let proxy handle it natively
  // app.addContentTypeParser('multipart/form-data', function (request, payload, done) {
  //   done(null, payload); // Pass through the raw stream
  // });

  // Global authentication middleware
  app.addHook('preHandler', authenticateJWT);

  // Health check
  app.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0',
    };
  });

  // Root info
  app.get('/', async () => {
    const baseInfo = {
      name: 'Ribeira Azul API Gateway',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
      },
    };

    // Only expose detailed config in development
    if (config.NODE_ENV !== 'production') {
      return {
        ...baseInfo,
        endpoints: {
          ...baseInfo.endpoints,
          properties: '/api/v1/properties',
        },
        config: {
          propertiesService: config.PROPERTIES_SERVICE_URL,
        },
      };
    }

    return baseInfo;
  });

  // Setup PRODUCTION-READY proxy
  await setupProxy(app as any);

  return app;
}