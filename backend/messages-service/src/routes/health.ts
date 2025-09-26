// Using simple container
import { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance) {
  const container = app.diContainer;
  const { healthService } = container;

  // Comprehensive health check
  app.get('/health', async (request, reply) => {
    try {
      const health = await healthService.getHealth();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      return reply.code(statusCode).send(health);
    } catch (error: any) {
      return reply.code(503).send({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      });
    }
  });

  // Kubernetes liveness probe
  app.get('/health/live', async (request, reply) => {
    try {
      const liveness = await healthService.getLiveness();
      return reply.send(liveness);
    } catch (error: any) {
      return reply.code(503).send({
        status: 'error',
        error: error.message,
        timestamp: new Date(),
      });
    }
  });

  // Kubernetes readiness probe
  app.get('/health/ready', async (request, reply) => {
    try {
      const readiness = await healthService.getReadiness();
      
      const statusCode = readiness.status === 'ready' ? 200 : 503;
      return reply.code(statusCode).send(readiness);
    } catch (error: any) {
      return reply.code(503).send({
        status: 'not-ready',
        error: error.message,
        timestamp: new Date(),
      });
    }
  });
}
