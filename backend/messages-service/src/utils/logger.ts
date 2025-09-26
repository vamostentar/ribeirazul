import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { config, configService } from './config';

// Create correlation ID for request tracing
export function createCorrelationId(): string {
  return uuidv4();
}

// Base logger configuration
const baseLogger = pino({
  level: config.LOG_LEVEL,
  base: {
    service: 'messages-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    hostname: process.env.HOSTNAME || 'unknown',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => {
      const { req, res, ...rest } = object;
      return rest;
    },
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  transport: configService.isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname,service,version,environment',
    }
  } : undefined,
});

// Enhanced logger with enterprise features
class EnterpriseLogger {
  private logger: pino.Logger;

  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  // Create child logger with correlation ID
  child(bindings: Record<string, any> = {}): EnterpriseLogger {
    const childLogger = this.logger.child({
      correlationId: bindings.correlationId || createCorrelationId(),
      ...bindings,
    });
    return new EnterpriseLogger(childLogger);
  }

  // Standard log levels
  fatal(msg: string, extra?: Record<string, any>): void {
    this.logger.fatal(extra, msg);
  }

  error(msg: string, extra?: Record<string, any>): void {
    this.logger.error(extra, msg);
  }

  warn(msg: string, extra?: Record<string, any>): void {
    this.logger.warn(extra, msg);
  }

  info(msg: string, extra?: Record<string, any>): void {
    this.logger.info(extra, msg);
  }

  debug(msg: string, extra?: Record<string, any>): void {
    this.logger.debug(extra, msg);
  }

  trace(msg: string, extra?: Record<string, any>): void {
    this.logger.trace(extra, msg);
  }

  // Enterprise logging methods
  audit(action: string, details: Record<string, any>): void {
    this.logger.info({
      type: 'audit',
      action,
      timestamp: new Date().toISOString(),
      ...details,
    }, `AUDIT: ${action}`);
  }

  security(event: string, details: Record<string, any>): void {
    this.logger.warn({
      type: 'security',
      event,
      timestamp: new Date().toISOString(),
      ...details,
    }, `SECURITY: ${event}`);
  }

  performance(operation: string, duration: number, details?: Record<string, any>): void {
    this.logger.info({
      type: 'performance',
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...details,
    }, `PERFORMANCE: ${operation} took ${duration}ms`);
  }

  business(event: string, details: Record<string, any>): void {
    this.logger.info({
      type: 'business',
      event,
      timestamp: new Date().toISOString(),
      ...details,
    }, `BUSINESS: ${event}`);
  }

  // HTTP request logging
  request(req: any, res: any): void {
    this.logger.info({
      type: 'request',
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime: res.responseTime,
    }, `${req.method} ${req.url} ${res.statusCode}`);
  }

  // Database operation logging
  database(operation: string, table: string, duration: number, details?: Record<string, any>): void {
    this.logger.debug({
      type: 'database',
      operation,
      table,
      duration,
      ...details,
    }, `DB: ${operation} on ${table} took ${duration}ms`);
  }

  // Queue operation logging
  queue(operation: string, queue: string, jobId?: string, details?: Record<string, any>): void {
    this.logger.info({
      type: 'queue',
      operation,
      queue,
      jobId,
      ...details,
    }, `QUEUE: ${operation} on ${queue}${jobId ? ` (job: ${jobId})` : ''}`);
  }

  // External service logging
  external(service: string, operation: string, duration: number, success: boolean, details?: Record<string, any>): void {
    const level = success ? 'info' : 'error';
    this.logger[level]({
      type: 'external',
      service,
      operation,
      duration,
      success,
      ...details,
    }, `EXTERNAL: ${service}.${operation} ${success ? 'succeeded' : 'failed'} in ${duration}ms`);
  }

  // Circuit breaker logging
  circuitBreaker(service: string, state: 'open' | 'closed' | 'half-open', details?: Record<string, any>): void {
    this.logger.warn({
      type: 'circuit-breaker',
      service,
      state,
      ...details,
    }, `CIRCUIT BREAKER: ${service} is now ${state}`);
  }
}

// Export singleton logger
export const logger = new EnterpriseLogger(baseLogger);

// Export factory for child loggers
export function createLogger(bindings: Record<string, any> = {}): EnterpriseLogger {
  return logger.child(bindings);
}

// createCorrelationId already exported above

export default logger;
