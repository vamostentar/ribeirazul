import { dependencyConfig } from '@/config/dependency-config';
import { HealthService } from '@/services/health.service';
import { ERROR_CODES, HTTP_STATUS } from '@/types/common';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Controller de health check
 * Gerencia as rotas de monitoramento e saúde do sistema
 */
export class HealthController {
  private healthService: HealthService;

  constructor() {
    this.healthService = new HealthService({
      database: dependencyConfig.database,
      cache: dependencyConfig.cache,
      observability: dependencyConfig.observability,
    });
  }

  /**
   * GET /health - Health check completo
   */
  async getHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = await this.healthService.checkHealth();
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.SERVICE_UNAVAILABLE).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.INTERNAL_ERROR,
        });
      }

      const statusCode = result.data!.status === 'healthy' 
        ? HTTP_STATUS.OK 
        : result.data!.status === 'degraded' 
          ? HTTP_STATUS.OK 
          : HTTP_STATUS.SERVICE_UNAVAILABLE;

      return reply.status(statusCode).send({
        success: true,
        data: result.data,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getHealth', { error });
      
      return reply.status(HTTP_STATUS.SERVICE_UNAVAILABLE).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /health/ready - Verifica se o sistema está pronto
   */
  async getReady(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const isReady = await this.healthService.isReady();
      
      const statusCode = isReady ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
      
      return reply.status(statusCode).send({
        success: isReady,
        data: {
          ready: isReady,
          timestamp: new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getReady', { error });
      
      return reply.status(HTTP_STATUS.SERVICE_UNAVAILABLE).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /health/live - Verifica se o sistema está vivo
   */
  async getLive(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const isAlive = await this.healthService.isAlive();
      
      const statusCode = isAlive ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
      
      return reply.status(statusCode).send({
        success: isAlive,
        data: {
          alive: isAlive,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getLive', { error });
      
      return reply.status(HTTP_STATUS.SERVICE_UNAVAILABLE).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /health/metrics - Obtém métricas do sistema
   */
  async getMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = await this.healthService.getSystemMetrics();
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.INTERNAL_ERROR,
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result.data,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getMetrics', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /health/database - Verifica saúde do banco de dados
   */
  async getDatabaseHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const isConnected = await dependencyConfig.database.isConnected();
      
      const statusCode = isConnected ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
      
      return reply.status(statusCode).send({
        success: isConnected,
        data: {
          connected: isConnected,
          timestamp: new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getDatabaseHealth', { error });
      
      return reply.status(HTTP_STATUS.SERVICE_UNAVAILABLE).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /health/cache - Verifica saúde do cache
   */
  async getCacheHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const isHealthy = await dependencyConfig.cache.isHealthy();
      
      const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.OK; // Cache não é crítico
      
      return reply.status(statusCode).send({
        success: isHealthy,
        data: {
          healthy: isHealthy,
          timestamp: new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getCacheHealth', { error });
      
      return reply.status(HTTP_STATUS.OK).send({ // Cache não é crítico
        success: false,
        error: 'Cache não disponível',
        code: ERROR_CODES.CACHE_ERROR,
      });
    }
  }
}
