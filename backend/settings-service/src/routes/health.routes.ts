import { HealthController } from '@/controllers/health.controller';
import { FastifyInstance } from 'fastify';

/**
 * Rotas de health check
 * GET /health, /health/ready, /health/live, /health/metrics
 */
export async function healthRoutes(fastify: FastifyInstance) {
  const healthController = new HealthController();

  // GET /health - Health check completo
  fastify.get('/health', {
    schema: {
      description: 'Health check completo do sistema',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                timestamp: { type: 'string', format: 'date-time' },
                uptime: { type: 'number' },
                version: { type: 'string' },
                services: {
                  type: 'object',
                  properties: {
                    database: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                        responseTime: { type: 'number' },
                        lastCheck: { type: 'string', format: 'date-time' },
                        error: { type: 'string' },
                      },
                    },
                    cache: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                        responseTime: { type: 'number' },
                        lastCheck: { type: 'string', format: 'date-time' },
                        error: { type: 'string' },
                      },
                    },
                    observability: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                        responseTime: { type: 'number' },
                        lastCheck: { type: 'string', format: 'date-time' },
                        error: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        503: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, healthController.getHealth.bind(healthController));

  // GET /health/ready - Verifica se o sistema está pronto
  fastify.get('/health/ready', {
    schema: {
      description: 'Verifica se o sistema está pronto para receber requisições',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                ready: { type: 'boolean' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        503: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, healthController.getReady.bind(healthController));

  // GET /health/live - Verifica se o sistema está vivo
  fastify.get('/health/live', {
    schema: {
      description: 'Verifica se o sistema está vivo (básico)',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                alive: { type: 'boolean' },
                uptime: { type: 'number' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        503: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, healthController.getLive.bind(healthController));

  // GET /health/metrics - Obtém métricas do sistema
  fastify.get('/health/metrics', {
    schema: {
      description: 'Obtém métricas do sistema',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                memory: {
                  type: 'object',
                  properties: {
                    used: { type: 'number' },
                    total: { type: 'number' },
                    percentage: { type: 'number' },
                  },
                },
                uptime: { type: 'number' },
                version: { type: 'string' },
                nodeVersion: { type: 'string' },
                platform: { type: 'string' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, healthController.getMetrics.bind(healthController));

  // GET /health/database - Verifica saúde do banco de dados
  fastify.get('/health/database', {
    schema: {
      description: 'Verifica a saúde do banco de dados',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        503: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, healthController.getDatabaseHealth.bind(healthController));

  // GET /health/cache - Verifica saúde do cache
  fastify.get('/health/cache', {
    schema: {
      description: 'Verifica a saúde do cache',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                healthy: { type: 'boolean' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, healthController.getCacheHealth.bind(healthController));
}
