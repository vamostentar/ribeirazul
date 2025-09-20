import { CacheManager, DatabaseConnection, ObservabilityManager } from '@/interfaces/database.interface';
import { HealthStatus, OperationResult, ServiceHealth } from '@/types/common';

/**
 * Serviço de health check
 * Monitora a saúde do sistema e suas dependências
 */
export class HealthService {
  private _database?: DatabaseConnection;
  private _cache?: CacheManager;
  private _observability?: ObservabilityManager;

  constructor(
    private dependencyConfig: {
      database: DatabaseConnection;
      cache: CacheManager;
      observability: ObservabilityManager;
    }
  ) {}

  // Lazy loading das dependências
  private get database(): DatabaseConnection {
    if (!this._database) {
      this._database = this.dependencyConfig.database;
    }
    return this._database;
  }

  private get cache(): CacheManager {
    if (!this._cache) {
      this._cache = this.dependencyConfig.cache;
    }
    return this._cache;
  }

  private get observability(): ObservabilityManager {
    if (!this._observability) {
      this._observability = this.dependencyConfig.observability;
    }
    return this._observability;
  }

  /**
   * Verifica a saúde geral do sistema
   */
  async checkHealth(): Promise<OperationResult<HealthStatus>> {
    const traceId = this.observability.startTrace('health_check');
    
    try {
      const startTime = Date.now();
      
      // Verificar saúde de todos os serviços
      const [databaseHealth, cacheHealth, observabilityHealth] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkCacheHealth(),
        this.checkObservabilityHealth(),
      ]);

      const services: { database: ServiceHealth; cache?: ServiceHealth; storage?: ServiceHealth; observability?: ServiceHealth } = {
        database: {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          error: 'Database not checked',
        },
      };
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      // Processar resultado do banco de dados
      if (databaseHealth.status === 'fulfilled') {
        services.database = databaseHealth.value;
        if (databaseHealth.value.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (databaseHealth.value.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } else {
        services.database = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          error: databaseHealth.reason?.message || 'Erro desconhecido',
        };
        overallStatus = 'unhealthy';
      }

      // Processar resultado do cache
      if (cacheHealth.status === 'fulfilled') {
        services.cache = cacheHealth.value;
        if (cacheHealth.value.status === 'unhealthy' && overallStatus === 'healthy') {
          overallStatus = 'degraded'; // Cache não é crítico
        }
      } else {
        services.cache = {
          status: 'degraded',
          lastCheck: new Date().toISOString(),
          error: cacheHealth.reason?.message || 'Erro desconhecido',
        };
        if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      }

      // Processar resultado da observabilidade
      if (observabilityHealth.status === 'fulfilled') {
        services.observability = observabilityHealth.value;
      } else {
        services.observability = {
          status: 'degraded',
          lastCheck: new Date().toISOString(),
          error: observabilityHealth.reason?.message || 'Erro desconhecido',
        };
        if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      }

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        services,
      };

      this.observability.info('Health check concluído', {
        overallStatus,
        responseTime: Date.now() - startTime,
        services: Object.keys(services),
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: healthStatus,
      };
    } catch (error) {
      this.observability.error('Erro durante health check', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Verifica a saúde do banco de dados
   */
  private async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    lastCheck: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const isConnected = await this.database.isConnected();
      const responseTime = Date.now() - startTime;
      
      if (!isConnected) {
        return {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          error: 'Banco de dados não conectado',
        };
      }

      // Teste adicional: tentar uma consulta simples
      try {
        await this.database.settings.exists('singleton');
      } catch (queryError) {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: `Erro na consulta: ${queryError instanceof Error ? queryError.message : 'Erro desconhecido'}`,
        };
      }

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Verifica a saúde do cache
   */
  private async checkCacheHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    lastCheck: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.cache.isHealthy();
      const responseTime = Date.now() - startTime;
      
      if (!isHealthy) {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: 'Cache não está funcionando corretamente',
        };
      }

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Verifica a saúde da observabilidade
   */
  private async checkObservabilityHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    lastCheck: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Teste básico de logging
      this.observability.debug('Health check test log');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Verifica se o sistema está pronto para receber requisições
   */
  async isReady(): Promise<boolean> {
    try {
      const healthResult = await this.checkHealth();
      
      if (!healthResult.success || !healthResult.data) {
        return false;
      }

      // Sistema está pronto se o banco de dados está saudável
      return healthResult.data.services.database?.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o sistema está vivo (básico)
   */
  async isAlive(): Promise<boolean> {
    try {
      // Verificação mínima - apenas se o processo está rodando
      return process.uptime() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Obtém métricas do sistema
   */
  async getSystemMetrics(): Promise<OperationResult<{
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
    version: string;
    nodeVersion: string;
    platform: string;
  }>> {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal + memUsage.external;
      const usedMem = memUsage.heapUsed + memUsage.external;
      
      return {
        success: true,
        data: {
          memory: {
            used: Math.round(usedMem / 1024 / 1024), // MB
            total: Math.round(totalMem / 1024 / 1024), // MB
            percentage: Math.round((usedMem / totalMem) * 100),
          },
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          nodeVersion: process.version,
          platform: process.platform,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}
