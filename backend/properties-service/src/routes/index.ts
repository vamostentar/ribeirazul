import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { imageRoutes } from './images.routes';
import { projectsRoutes } from './projects';
import { propertiesRoutes } from './properties';
import { settingsRoutes } from './settings';

export async function registerRoutes(fastify: FastifyInstance) {
  // Health check routes
  await fastify.register(healthRoutes);

  // API routes (clean architecture) - routes define their own /api/v1 prefix
  await fastify.register(async function (fastify) {
    // Property routes (clean architecture)
    await fastify.register(propertiesRoutes);
    // Image routes
    await fastify.register(imageRoutes);
    // Settings routes
    await fastify.register(settingsRoutes);
    // Projects routes
    await fastify.register(projectsRoutes);
  });
  
  // Register a catch-all route for API documentation or 404
  fastify.get('/', async (request, reply) => {
    return reply.send({
      service: 'Properties Service',
      version: '2.0.0',
      description: 'Real Estate Properties Management API',
      documentation: '/api/v1/documentation',
      health: '/health',
      architecture: {
        current: 'Clean Architecture (V2) + Legacy (V1)',
        migration: 'V1 → V2 in progress',
        benefits: [
          '100% Database replaceable (Prisma → Postgres, etc.)',
          'Pure business logic isolated from frameworks',
          'Simple dependency injection',
          'Comprehensive error handling',
          'Easy unit testing'
        ]
      },
      endpoints: {
        'v2-clean-architecture': {
          info: 'GET /api/v2/info',
          create: 'POST /api/v2/properties',
          list: 'GET /api/v2/properties',
          get: 'GET /api/v2/properties/{id}',
          update: 'PUT /api/v2/properties/{id}',
          delete: 'DELETE /api/v2/properties/{id}',
          search: 'GET /api/v2/properties/search?q={query}',
          nearby: 'GET /api/v2/properties/nearby?lat={lat}&lng={lng}',
          stats: 'GET /api/v2/properties-stats',
          health: 'GET /api/v2/health'
        },
        'v1-legacy': {
          create: 'POST /api/v1/properties',
          list: 'GET /api/v1/properties',
          get: 'GET /api/v1/properties/{id}',
          update: 'PUT /api/v1/properties/{id}',
          delete: 'DELETE /api/v1/properties/{id}',
          search: 'GET /api/v1/properties/search?q={query}',
          nearby: 'GET /api/v1/properties/nearby?lat={lat}&lng={lng}',
          stats: 'GET /api/v1/properties-stats'
        },
        health: {
          health: 'GET /health',
          ready: 'GET /ready',
          live: 'GET /live',
          info: 'GET /info'
        }
      },
      timestamp: new Date().toISOString(),
    });
  });
  
  // Handle 404 for API routes
  fastify.setNotFoundHandler({
    // preHandler: fastify.rateLimit() // REMOVED TEMPORARILY
  }, async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({
        error: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: '/api/v1',
      });
    }
    
    return reply.code(404).send({
      error: 'Page not found',
      code: 'PAGE_NOT_FOUND',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  });
}
