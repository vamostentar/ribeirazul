/**
 * Interface para observabilidade
 */
export interface ObservabilityManager {
  // Logging
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;

  // Métricas
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  recordGauge(name: string, value: number, labels?: Record<string, string>): void;

  // Tracing
  startTrace(name: string): string;
  startSpan(traceId: string, name: string): string;
  endSpan(spanId: string): void;
  endTrace(traceId: string): void;

  // Health check
  checkHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      lastCheck: string;
      error?: string;
    }>;
  }>;

  // Métricas específicas do settings service
  recordSettingsUpdate(fieldName: string, userId?: string): void;
  recordSettingsRead(userId?: string): void;
  recordModuleSettingsUpdate(moduleName: string, userId?: string): void;
  recordCacheHit(key: string): void;
  recordCacheMiss(key: string): void;
}
