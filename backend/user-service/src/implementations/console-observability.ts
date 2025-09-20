import {
  ObservabilityManager,
  LogLevel,
  HealthCheckResult,
  HealthStatus,
  Timer,
  ObservabilityConfig,
} from '@/interfaces/observability.interface';

/**
 * Implementação de observabilidade usando console
 * Segue o padrão black box - esconde detalhes de implementação
 */
export class ConsoleObservabilityManager implements ObservabilityManager {
  private config: ObservabilityConfig;
  private context: Record<string, any> = {};
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private startTime = Date.now();

  constructor(config: ObservabilityConfig) {
    this.config = config;
  }

  log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    if (!this.config.loggingEnabled) return;

    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = logLevels[this.config.logLevel];
    const messageLevel = logLevels[level];

    if (messageLevel < configLevel) return;

    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(this.context).length > 0 ? 
      ` ${JSON.stringify(this.context)}` : '';

    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${metaStr}`);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log('error', message, meta);
  }

  incrementCounter(name: string, value = 1, tags?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;
    
    const tagsStr = tags ? ` ${JSON.stringify(tags)}` : '';
    this.debug(`METRIC: counter.${name} +${value}${tagsStr}`);
  }

  decrementCounter(name: string, value = 1, tags?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;
    
    const tagsStr = tags ? ` ${JSON.stringify(tags)}` : '';
    this.debug(`METRIC: counter.${name} -${value}${tagsStr}`);
  }

  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;
    
    const tagsStr = tags ? ` ${JSON.stringify(tags)}` : '';
    this.debug(`METRIC: gauge.${name} =${value}${tagsStr}`);
  }

  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;
    
    const tagsStr = tags ? ` ${JSON.stringify(tags)}` : '';
    this.debug(`METRIC: histogram.${name} ${value}${tagsStr}`);
  }

  recordTiming(name: string, duration: number, tags?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;
    
    const tagsStr = tags ? ` ${JSON.stringify(tags)}` : '';
    this.debug(`METRIC: timing.${name} ${duration}ms${tagsStr}`);
  }

  audit(action: string, resource: string, resourceId: string, actor?: string, metadata?: Record<string, any>): void {
    if (!this.config.auditEnabled) return;

    const auditData = {
      action,
      resource,
      resourceId,
      actor,
      timestamp: new Date().toISOString(),
      metadata,
      context: this.context,
    };

    this.info(`AUDIT: ${action} on ${resource}:${resourceId}`, auditData);
  }

  healthCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, check);
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const checks: Record<string, HealthCheckResult> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    for (const [name, checkFn] of this.healthChecks) {
      try {
        const result = await checkFn();
        checks[name] = result;
        
        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks[name] = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      overall: overallStatus,
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
    };
  }

  startTimer(name: string): Timer {
    const startTime = Date.now();
    
    const self = this;
    return {
      end(): number {
        const duration = Date.now() - startTime;
        self.recordTiming(name, duration);
        return duration;
      },
      endWithTags(tags: Record<string, string>): number {
        const duration = Date.now() - startTime;
        self.recordTiming(name, duration, tags);
        return duration;
      },
    };
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const timer = this.startTimer(name);
    try {
      const result = await fn();
      timer.end();
      return result;
    } catch (error) {
      timer.endWithTags({ error: 'true' });
      throw error;
    }
  }

  measureSync<T>(name: string, fn: () => T): T {
    const timer = this.startTimer(name);
    try {
      const result = fn();
      timer.end();
      return result;
    } catch (error) {
      timer.endWithTags({ error: 'true' });
      throw error;
    }
  }

  setContext(key: string, value: any): void {
    this.context[key] = value;
  }

  getContext(key: string): any {
    return this.context[key];
  }

  clearContext(): void {
    this.context = {};
  }

  withContext(context: Record<string, any>, fn: () => void): void {
    const originalContext = { ...this.context };
    Object.assign(this.context, context);
    
    try {
      fn();
    } finally {
      this.context = originalContext;
    }
  }
}
