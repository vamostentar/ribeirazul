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

      try {
        const incoming = new URL(origin);
        const incomingOrigin = `${incoming.protocol}//${incoming.hostname}` + (incoming.port ? `:${incoming.port}` : '');

        // Helper to generate www/non-www permutations
        const variants = new Set<string>();
        variants.add(incomingOrigin);
        const host = incoming.hostname;
        if (host.startsWith('www.')) {
          variants.add(`${incoming.protocol}//${host.replace(/^www\./, '')}`);
        } else {
          variants.add(`${incoming.protocol}//www.${host}`);
        }

        // Also consider origins in config (already normalized) and check against variants
        for (const v of variants) {
          if (config.CORS_ORIGINS.includes(v)) {
            return callback(null, true);
          }
        }

        console.log(`🚫 CORS: Origin ${origin} not allowed. Allowed origins:`, config.CORS_ORIGINS);
        return callback(new Error('Not allowed by CORS'), false);
      } catch (err) {
        // If origin is malformed, deny
        console.log('🚫 CORS: Malformed origin', origin);
        return callback(new Error('Not allowed by CORS'), false);
      }
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

  // Preflight OPTIONS requests são geridos automaticamente por @fastify/cors.
  // Evitamos declarar manualmente uma rota OPTIONS global para não duplicar.

  // Safety: add a generic OPTIONS handler for preflight to ensure preflight
  // requests are answered by the gateway and not forwarded upstream. This
  // guarantees the Access-Control-* headers are present for proxied routes.
  app.options('/*', async (request: any, reply: any) => {
    const origin = request.headers.origin;
    // If no origin, just respond OK
    if (!origin) {
      reply.status(204).send();
      return;
    }

    // If origin allowed, return proper headers
    if (config.CORS_ORIGINS.includes(origin) || config.CORS_ORIGINS.includes(new URL(origin).origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Vary', 'Origin');
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Request-ID,X-Correlation-ID,X-API-Key,Accept,Origin,Cache-Control,Pragma');
      reply.status(204).send();
      return;
    }

    // Deny preflight if origin not allowed
    reply.status(403).send({ error: 'CORS Origin not allowed' });
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

  // Force CORS headers on every response (including errors/404)
  app.addHook('onSend', async (request: any, reply: any, payload: any) => {
    const origin = request.headers.origin;
    if (origin && config.CORS_ORIGINS.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Vary', 'Origin');
    }
    reply.header('Access-Control-Allow-Credentials', 'true');
    return payload;
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