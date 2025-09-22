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
  console.log('🔧 CORS Configuration:', {
    origins: config.CORS_ORIGINS,
    environment: config.NODE_ENV
  });
  
  await app.register(import('@fastify/cors'), {
    origin: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (config.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      
      console.log(`🚫 CORS: Origin ${origin} not allowed. Allowed origins:`, config.CORS_ORIGINS);
      return callback(new Error('Not allowed by CORS'), false);
    },
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

  // Add CORS debug hook
  app.addHook('onRequest', async (request: any, reply: any) => {
    if (config.ENABLE_DETAILED_LOGGING) {
      const origin = request.headers.origin;
      const method = request.method;
      const url = request.url;
      
      if (origin) {
        console.log(`🌐 CORS Request: ${method} ${url} from origin: ${origin}`);
      }
    }
  });

  // Setup proxy routes first
  await setupProxy(app);

  // Global authentication middleware - AFTER CORS and proxy setup
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

  return app;
}