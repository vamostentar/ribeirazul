import { FastifyInstance } from 'fastify';
import { IncomingHttpHeaders } from 'http';
import { config } from './config.js';

/**
 * PRODUCTION-READY PROXY CONFIGURATION
 * 
 * This implementation uses ONLY @fastify/http-proxy for all services
 * to ensure reliability, maintainability, and production readiness.
 * 
 * No custom StreamProxy implementations or workarounds.
 */
export async function setupProxy(app: FastifyInstance) {
  if (config.ENABLE_DETAILED_LOGGING) {
    console.log('🔧 Setting up PRODUCTION-READY proxy...');
  }

  // Standard header processing for all proxies
  const standardHeaderProcessor = (originalReq: any, headers: IncomingHttpHeaders) => {
    // Prefer any existing X-Forwarded-Proto header from the front proxy (may be lower/upper case)
    const incomingXfp = (headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || headers['X-Forwarded-PRoto']) as string | undefined;

    const processedHeaders: IncomingHttpHeaders = {
      ...headers,
      'x-forwarded-by': 'api-gateway',
      'x-forwarded-for': originalReq.ip,
      'x-forwarded-proto': incomingXfp || originalReq.protocol,
    };
    
    // Pass authenticated user information to backend services
    if (originalReq.user) {
      processedHeaders['x-user-id'] = originalReq.user.id;
      processedHeaders['x-user-email'] = originalReq.user.email;
      processedHeaders['x-user-role'] = originalReq.user.role;
    }
    
    // CRITICAL: Preserve multipart/form-data Content-Type for file uploads
    const originalContentType = headers['content-type'];
    if (originalContentType && originalContentType.includes('multipart/form-data')) {
      processedHeaders['content-type'] = originalContentType;
      console.log('🔧 Preserving multipart Content-Type:', originalContentType);
    }
    
    // Remove problematic headers (but NOT content-type for multipart)
    delete processedHeaders.expect;
    delete processedHeaders.Expect;
    delete processedHeaders.host; // Let proxy set the correct host
    
    return processedHeaders;
  };

  // 1. AUTH SERVICE PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.AUTH_SERVICE_URL,
    prefix: '/api/v1/auth',
    websocket: false,
    rewritePrefix: '/api/v1/auth',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 2. USERS SERVICE PROXY (Admin Management)
  // Note: Register specific routes before wildcard routes to avoid conflicts
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/users',
    websocket: false,
    rewritePrefix: '/api/v1/users',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 3. ROLES ENDPOINT PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/roles',
    websocket: false,
    rewritePrefix: '/api/v1/roles',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 4. USER PROFILES PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/user-profiles',
    websocket: false,
    rewritePrefix: '/api/v1/user-profiles',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 5. ADMIN ENDPOINTS PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/admin',
    websocket: false,
    rewritePrefix: '/api/v1/admin',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 6. PROPERTIES SERVICE PROXY (with minimal auth-only header processing)
  const minimalAuthHeaderProcessor = (originalReq: any, headers: IncomingHttpHeaders) => {
    const processedHeaders: IncomingHttpHeaders = {
      ...headers, // Preserve ALL original headers including Content-Type
    };
    
    // Only add auth headers
    if (originalReq.user) {
      processedHeaders['x-user-id'] = originalReq.user.id;
      processedHeaders['x-user-email'] = originalReq.user.email;
      processedHeaders['x-user-role'] = originalReq.user.role;
    }
    
    // DO NOT remove any headers - preserve everything for multipart
    return processedHeaders;
  };

  await app.register(import('@fastify/http-proxy'), {
    upstream: config.PROPERTIES_SERVICE_URL,
    prefix: '/api/v1/properties',
    websocket: false,
    rewritePrefix: '/api/v1/properties',
    replyOptions: {
      rewriteRequestHeaders: minimalAuthHeaderProcessor,
    }
  });

  // 7. PROPERTIES STATS PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.PROPERTIES_SERVICE_URL,
    prefix: '/api/v1/properties-stats',
    websocket: false,
    rewritePrefix: '/api/v1/properties-stats',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 8. MEDIA SERVICE PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.MEDIA_SERVICE_URL,
    prefix: '/api/v1/media',
    websocket: false,
    rewritePrefix: '/api/v1/media',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 9. SETTINGS SERVICE PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.SETTINGS_SERVICE_URL,
    prefix: '/api/v1/settings',
    websocket: false,
    rewritePrefix: '/api/v1/settings',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 10. MODULE SETTINGS PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.SETTINGS_SERVICE_URL,
    prefix: '/api/v1/module-settings',
    websocket: false,
    rewritePrefix: '/api/v1/module-settings',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 11. USER PREFERENCES PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/user-preferences',
    websocket: false,
    rewritePrefix: '/api/v1/user-preferences',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 12. PROPERTY INTERESTS PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/property-interests',
    websocket: false,
    rewritePrefix: '/api/v1/property-interests',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 13. SAVED PROPERTIES PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/saved-properties',
    websocket: false,
    rewritePrefix: '/api/v1/saved-properties',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 14. SEARCH HISTORY PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/search-history',
    websocket: false,
    rewritePrefix: '/api/v1/search-history',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 15. NOTIFICATIONS PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.USERS_SERVICE_URL,
    prefix: '/api/v1/notifications',
    websocket: false,
    rewritePrefix: '/api/v1/notifications',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 16. IMAGES PROXY - Direct routes for image management
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.PROPERTIES_SERVICE_URL,
    prefix: '/api/v1/images',
    websocket: false,
    rewritePrefix: '/api/v1/images',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  // 17. UPLOADS PROXY (static files) - PUBLIC ROUTE, NO AUTH HEADERS NEEDED
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.PROPERTIES_SERVICE_URL,
    prefix: '/uploads',
    websocket: false,
    rewritePrefix: '/uploads',
    // No header processing for static files - keep it simple and public
  });

  // 18. PROJECTS PROXY
  await app.register(import('@fastify/http-proxy'), {
    upstream: config.PROPERTIES_SERVICE_URL,
    prefix: '/api/v1/projects',
    websocket: false,
    rewritePrefix: '/api/v1/projects',
    replyOptions: {
      rewriteRequestHeaders: standardHeaderProcessor,
    }
  });

  if (config.ENABLE_DETAILED_LOGGING) {
    console.log('✅ PRODUCTION-READY proxy configured for ALL services');
    console.log('📍 Total Proxies Configured: 19');
    console.log(`📍 Auth Service: ${config.AUTH_SERVICE_URL}`);
    console.log(`📍 Users Service: ${config.USERS_SERVICE_URL}`);
    console.log(`📍 Properties Service: ${config.PROPERTIES_SERVICE_URL}`);
    console.log(`📍 Media Service: ${config.MEDIA_SERVICE_URL}`);
    console.log(`📍 Settings Service: ${config.SETTINGS_SERVICE_URL}`);
  }
}
