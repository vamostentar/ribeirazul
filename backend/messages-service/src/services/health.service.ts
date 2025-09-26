import { config } from '@/utils/config';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { CircuitBreakerService } from './circuit-breaker.service';
import { EmailService } from './email.service';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: any;
  responseTime?: number;
  lastCheck: Date;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  uptime: number;
  timestamp: Date;
  version: string;
  environment: string;
}

export class HealthService {
  constructor(
    private prisma: PrismaClient,
    private emailService: EmailService,
    private circuitBreakerService: CircuitBreakerService,
    private redis?: Redis,
    private emailQueue?: Queue
  ) {}

  async getHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    // Database health check
    checks.push(await this.checkDatabase());

    // Redis health check (if available)
    if (this.redis) {
      checks.push(await this.checkRedis());
    }

    // Email service health check
    checks.push(await this.checkEmailService());

    // Queue health check (if available)
    if (this.emailQueue) {
      checks.push(await this.checkQueue());
    }

    // Circuit breaker health check
    checks.push(await this.checkCircuitBreakers());

    // System resources check
    checks.push(await this.checkSystemResources());

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks);

    const health: SystemHealth = {
      status: overallStatus,
      checks,
      uptime: process.uptime(),
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
    };

    const totalTime = Date.now() - startTime;
    logger.debug('Health check completed', {
      status: overallStatus,
      totalTime,
      checksCount: checks.length,
    });

    return health;
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check database stats
      const messageCount = await this.prisma.message.count();
      
      return {
        name: 'database',
        status: 'healthy',
        message: 'Database is accessible',
        details: {
          totalMessages: messageCount,
          connection: 'active',
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      logger.error('Database health check failed', {
        error: error.message,
      });

      return {
        name: 'database',
        status: 'unhealthy',
        message: 'Database is not accessible',
        details: {
          error: error.message,
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      if (!this.redis) {
        return {
          name: 'redis',
          status: 'degraded',
          message: 'Redis not configured',
          lastCheck: new Date(),
        };
      }

      // Test Redis connectivity
      const pong = await this.redis.ping();
      const info = await this.redis.info('memory');
      const dbsize = await this.redis.dbsize();

      if (pong !== 'PONG') {
        throw new Error('Redis ping failed');
      }

      return {
        name: 'redis',
        status: 'healthy',
        message: 'Redis is accessible',
        details: {
          connected: true,
          keys: dbsize,
          memory: info.split('\r\n').find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown',
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      logger.error('Redis health check failed', {
        error: error.message,
      });

      return {
        name: 'redis',
        status: 'unhealthy',
        message: 'Redis is not accessible',
        details: {
          error: error.message,
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }

  private async checkEmailService(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const emailHealth = await this.emailService.getHealth();
      
      return {
        name: 'email',
        status: emailHealth.status,
        message: emailHealth.status === 'healthy' ? 'Email service is working' : 'Email service has issues',
        details: emailHealth.details,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      logger.error('Email service health check failed', {
        error: error.message,
      });

      return {
        name: 'email',
        status: 'unhealthy',
        message: 'Email service check failed',
        details: {
          error: error.message,
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }

  private async checkQueue(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      if (!this.emailQueue) {
        return {
          name: 'queue',
          status: 'degraded',
          message: 'Queue not configured',
          lastCheck: new Date(),
        };
      }

      const waiting = await this.emailQueue.getWaiting();
      const active = await this.emailQueue.getActive();
      const completed = await this.emailQueue.getCompleted();
      const failed = await this.emailQueue.getFailed();

      return {
        name: 'queue',
        status: 'healthy',
        message: 'Queue is operational',
        details: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      logger.error('Queue health check failed', {
        error: error.message,
      });

      return {
        name: 'queue',
        status: 'unhealthy',
        message: 'Queue is not accessible',
        details: {
          error: error.message,
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }

  private async checkCircuitBreakers(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const stats = this.circuitBreakerService.getStats();
      const openBreakers = Object.entries(stats).filter(([, stat]: [string, any]) => stat.state === 'open');
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let message = 'All circuit breakers are closed';

      if (openBreakers.length > 0) {
        status = 'degraded';
        message = `${openBreakers.length} circuit breaker(s) are open`;
      }

      return {
        name: 'circuit-breakers',
        status,
        message,
        details: stats,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      logger.error('Circuit breaker health check failed', {
        error: error.message,
      });

      return {
        name: 'circuit-breakers',
        status: 'unhealthy',
        message: 'Circuit breaker check failed',
        details: {
          error: error.message,
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }

  private async checkSystemResources(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Convert to MB
      const memoryMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      };

      // Memory threshold check (warning if heap used > 80% of heap total)
      const memoryUsagePercent = (memoryMB.heapUsed / memoryMB.heapTotal) * 100;
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let message = 'System resources are normal';

      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        message = 'High memory usage detected';
      } else if (memoryUsagePercent > 80) {
        status = 'degraded';
        message = 'Elevated memory usage';
      }

      return {
        name: 'system-resources',
        status,
        message,
        details: {
          memory: memoryMB,
          memoryUsagePercent: Math.round(memoryUsagePercent),
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      logger.error('System resources health check failed', {
        error: error.message,
      });

      return {
        name: 'system-resources',
        status: 'unhealthy',
        message: 'System resources check failed',
        details: {
          error: error.message,
        },
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }

  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const degradedChecks = checks.filter(check => check.status === 'degraded');

    // If any critical service is unhealthy, overall status is unhealthy
    const criticalServices = ['database', 'email'];
    const criticalUnhealthy = unhealthyChecks.some(check => criticalServices.includes(check.name));

    if (criticalUnhealthy) {
      return 'unhealthy';
    }

    // If any service is unhealthy or degraded, overall status is degraded
    if (unhealthyChecks.length > 0 || degradedChecks.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  async getLiveness(): Promise<{ status: 'ok' | 'error'; timestamp: Date }> {
    // Simple liveness check - just verify the process is running
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }

  async getReadiness(): Promise<{ status: 'ready' | 'not-ready'; timestamp: Date; details?: any }> {
    try {
      // Check critical dependencies for readiness
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ready',
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        status: 'not-ready',
        timestamp: new Date(),
        details: {
          error: error.message,
        },
      };
    }
  }
}
