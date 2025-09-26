// Using simple container
import { config } from '@/utils/config';
import { FastifyInstance } from 'fastify';

export async function registerMetricsRoutes(app: FastifyInstance) {
  if (!config.METRICS_ENABLED) {
    return;
  }

  const container = app.diContainer;
  const { metricsService, cacheService } = container;

  // Prometheus metrics endpoint
  app.get('/metrics', async (request, reply) => {
    try {
      const metrics = await metricsService.getMetrics();
      
      reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return reply.send(metrics);
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'METRICS_ERROR',
        message: 'Failed to generate metrics',
      });
    }
  });

  // Cache statistics endpoint
  app.get('/metrics/cache', async (request, reply) => {
    try {
      const stats = await cacheService.getStats();
      
      return reply.send({
        success: true,
        data: stats,
        timestamp: new Date(),
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'CACHE_STATS_ERROR',
        message: 'Failed to get cache statistics',
      });
    }
  });
}
