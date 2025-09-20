import { AuditAction, RequestContext } from '@/types/common';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Interface para abstração de sistema de observabilidade
 * Permite trocar implementações (Prometheus, DataDog, etc.) sem afetar o código de negócio
 */
export interface ObservabilityManager {
  /**
   * Registra uma métrica
   */
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void;

  /**
   * Incrementa um contador
   */
  incrementCounter(
    name: string,
    labels?: Record<string, string>
  ): void;

  /**
   * Registra tempo de execução
   */
  recordTiming(
    name: string,
    duration: number,
    labels?: Record<string, string>
  ): void;

  /**
   * Inicia timer para medição
   */
  startTimer(name: string, labels?: Record<string, string>): () => void;

  /**
   * Registra log estruturado
   */
  log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): void;

  /**
   * Registra erro
   */
  logError(
    error: Error,
    context?: Record<string, any>
  ): void;

  /**
   * Registra evento de auditoria
   */
  audit(
    action: AuditAction,
    userId?: string,
    resource?: string,
    resourceId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Registra request HTTP
   */
  recordRequest(
    context: RequestContext,
    statusCode: number,
    duration: number
  ): void;

  /**
   * Registra evento de segurança
   */
  recordSecurityEvent(
    type: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): void;
}

/**
 * Interface para métricas de sistema
 */
export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  activeSessions: number;
  requestsPerMinute: number;
  errorsPerMinute: number;
  uptime: number;
}

/**
 * Interface para coletor de métricas de sistema
 */
export interface SystemMetricsCollector {
  collect(): Promise<SystemMetrics>;
  startCollection(intervalMs: number): void;
  stopCollection(): void;
}

/**
 * Interface para configuração de observabilidade
 */
export interface ObservabilityConfig {
  enabled: boolean;
  metricsEnabled: boolean;
  loggingEnabled: boolean;
  auditEnabled: boolean;
  metricsInterval: number; // em ms
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  externalService?: {
    endpoint: string;
    apiKey?: string;
    timeout: number;
  };
}
