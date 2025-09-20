/**
 * Interface para sistema de observabilidade
 * Abstrai logging, métricas e auditoria
 */
export interface ObservabilityManager {
  /**
   * Logging
   */
  log(level: LogLevel, message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;

  /**
   * Métricas
   */
  incrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
  decrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
  setGauge(name: string, value: number, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
  recordTiming(name: string, duration: number, tags?: Record<string, string>): void;

  /**
   * Auditoria
   */
  audit(action: string, resource: string, resourceId: string, actor?: string, metadata?: Record<string, any>): void;

  /**
   * Health checks
   */
  healthCheck(name: string, check: () => Promise<HealthCheckResult>): void;
  getHealthStatus(): Promise<HealthStatus>;

  /**
   * Performance monitoring
   */
  startTimer(name: string): Timer;
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
  measureSync<T>(name: string, fn: () => T): T;

  /**
   * Context management
   */
  setContext(key: string, value: any): void;
  getContext(key: string): any;
  clearContext(): void;
  withContext(context: Record<string, any>, fn: () => void): void;
}

/**
 * Níveis de log
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Resultado de health check
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Status geral de saúde
 */
export interface HealthStatus {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, HealthCheckResult>;
  timestamp: Date;
  uptime: number;
}

/**
 * Timer para medição de performance
 */
export interface Timer {
  end(): number;
  endWithTags(tags: Record<string, string>): number;
}

/**
 * Configuração de observabilidade
 */
export interface ObservabilityConfig {
  enabled: boolean;
  metricsEnabled: boolean;
  loggingEnabled: boolean;
  auditEnabled: boolean;
  metricsInterval: number;
  logLevel: LogLevel;
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
}
