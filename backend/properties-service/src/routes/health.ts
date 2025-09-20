import { FastifyInstance } from 'fastify';
import { checkDatabaseHealth } from '../config/database';
import { config } from '../config/index';
import { HealthCheck } from '../types/common';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    const startTime = Date.now();
    
    try {
      const [dbHealthy] = await Promise.allSettled([
        checkDatabaseHealth(),
        // Add more health checks here (Redis, external APIs, etc.)
      ]);
      
      const isDbHealthy = dbHealthy.status === 'fulfilled' && dbHealthy.value === true;
      const isSystemHealthy = isDbHealthy; // Add more checks as needed
      
      const healthCheck: HealthCheck = {
        status: isSystemHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: isDbHealthy ? 'up' : 'down',
          // cache: isCacheHealthy ? 'up' : 'down', // Add when Redis is implemented
        },
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      };
      
      const statusCode = isSystemHealthy ? 200 : 503;
      const responseTime = Date.now() - startTime;
      
      fastify.log.info({ 
        healthCheck, 
        responseTime: `${responseTime}ms` 
      }, `Health check completed - ${healthCheck.status}`);
      
      return reply.code(statusCode).send(healthCheck);
    } catch (error) {
      fastify.log.error({ error }, 'Health check failed');
      
      return reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      });
    }
  });
  
  // Readiness check (Kubernetes)
  fastify.get('/ready', async (request, reply) => {
    try {
      const isDbReady = await checkDatabaseHealth();
      
      if (isDbReady) {
        return reply.code(200).send({ status: 'ready' });
      } else {
        return reply.code(503).send({ status: 'not ready' });
      }
    } catch (error) {
      fastify.log.error({ error }, 'Readiness check failed');
      return reply.code(503).send({ 
        status: 'not ready', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Liveness check (Kubernetes)
  fastify.get('/live', async (request, reply) => {
    return reply.code(200).send({ 
      status: 'alive', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
  
  // Detailed system information (for monitoring/debugging)
  fastify.get('/info', async (request, reply) => {
    const memoryUsage = process.memoryUsage();
    
    return reply.send({
      service: 'properties-service',
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
      },
    });
  });
}
