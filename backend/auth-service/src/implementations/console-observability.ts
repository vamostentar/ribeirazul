import { LogLevel, ObservabilityConfig, ObservabilityManager, SystemMetrics } from '@/interfaces/observability.interface';

/**
 * Implementação básica da interface ObservabilityManager usando console
 * Em produção, seria substituída por implementações como DataDog, New Relic, etc.
 */
export class ConsoleObservabilityManager implements ObservabilityManager {
  constructor(private config: ObservabilityConfig) {}

  log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (!this.config.loggingEnabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    switch (level) {
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'info':
        console.info(JSON.stringify(logEntry));
        break;
      case 'debug':
        if (this.config.logLevel === 'debug') {
          console.debug(JSON.stringify(logEntry));
        }
        break;
    }
  }

  logError(error: Error, metadata?: Record<string, any>): void {
    this.log('error', error.message, {
      ...metadata,
      stack: error.stack,
      name: error.name,
    });
  }

  logWarning(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  logInfo(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  logDebug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;

    const metric = {
      type: 'counter',
      name,
      labels: labels || {},
      value: 1,
      timestamp: Date.now(),
    };

    console.log(`METRIC: ${JSON.stringify(metric)}`);
  }

  recordTiming(name: string, duration: number, labels?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;

    const metric = {
      type: 'histogram',
      name,
      labels: labels || {},
      value: duration,
      timestamp: Date.now(),
    };

    console.log(`METRIC: ${JSON.stringify(metric)}`);
  }

  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;

    const metric = {
      type: 'gauge',
      name,
      labels: labels || {},
      value,
      timestamp: Date.now(),
    };

    console.log(`METRIC: ${JSON.stringify(metric)}`);
  }

  recordBusinessOperation(
    operation: string,
    context: Record<string, any>,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.auditEnabled) return;

    const auditEntry = {
      type: 'business_operation',
      operation,
      context,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    console.log(`AUDIT: ${JSON.stringify(auditEntry)}`);
  }

  recordSecurityEvent(
    type: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.auditEnabled) return;

    const securityEntry = {
      type: 'security_event',
      eventType: type,
      userId,
      ipAddress,
      userAgent,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    console.log(`SECURITY: ${JSON.stringify(securityEntry)}`);
  }

  recordHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    if (!this.config.metricsEnabled) return;

    this.incrementCounter('http_requests_total', { 
      method: context?.method || method, 
      status: statusCode.toString() 
    });
    this.recordTiming('http_request_duration', duration, { 
      method: context?.method || method 
    });
  }

  recordDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    ipAddress: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.metricsEnabled) return;

    this.recordTiming('db_operation_duration', duration, { operation, table });
    this.incrementCounter('db_operations_total', { operation, table, success: success.toString() });
  }

  recordCacheOperation(
    operation: 'get' | 'set' | 'delete' | 'hit' | 'miss',
    key: string,
    duration?: number,
    success?: boolean
  ): void {
    if (!this.config.metricsEnabled) return;

    this.incrementCounter('cache_operations_total', { operation, success: success?.toString() || 'true' });
    
    if (duration !== undefined) {
      this.recordTiming('cache_operation_duration', duration, { operation });
    }
  }

  recordCustomEvent(
    eventName: string,
    data: Record<string, any>,
    level: LogLevel = 'info'
  ): void {
    this.log(level, `Custom event: ${eventName}`, data);
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: 0, // Would need additional implementation
      activeConnections: 0, // Would need additional implementation
      activeSessions: 0, // Would need additional implementation
      requestsPerMinute: 0, // Would need additional implementation
      errorsPerMinute: 0, // Would need additional implementation
      uptime: process.uptime(),
    };
  }

  createTraceSpan(name: string, context?: Record<string, any>): {
    setTag(key: string, value: string): void;
    setError(error: Error): void;
    finish(): void;
  } {
    const spanId = Math.random().toString(36).substring(7);
    
    return {
      setTag: (key: string, value: string) => {
        console.log(`TRACE_SPAN: ${spanId} - TAG: ${key}=${value}`);
      },
      setError: (error: Error) => {
        console.log(`TRACE_SPAN: ${spanId} - ERROR: ${error.message}`);
      },
      finish: () => {
        console.log(`TRACE_SPAN: ${spanId} - FINISHED: ${name}`);
      },
    };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): ObservabilityConfig {
    return { ...this.config };
  }

  startTimer(name: string, labels?: Record<string, string>): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordTiming(name, duration, labels);
    };
  }

  async audit(
    action: string,
    userId?: string,
    resource?: string,
    resourceId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.auditEnabled) return;

    const auditEntry = {
      type: 'audit',
      action,
      resource,
      resourceId,
      userId,
      oldValues,
      newValues,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    console.log(`AUDIT: ${JSON.stringify(auditEntry)}`);
  }

  recordRequest(
    context: any,
    statusCode: number,
    duration: number
  ): void {
    this.recordHttpRequest(context.method || 'GET', context.url || '', statusCode, duration, {
      method: context.method,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
