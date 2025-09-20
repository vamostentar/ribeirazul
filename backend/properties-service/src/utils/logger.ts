import pino from 'pino';
import { config } from '../config/index';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Specific loggers for different contexts
export const dbLogger = logger.child({ component: 'database' });
export const httpLogger = logger.child({ component: 'http' });
export const serviceLogger = logger.child({ component: 'service' });
export const repositoryLogger = logger.child({ component: 'repository' });

// Helper functions for structured logging
export function logHttpRequest(method: string, path: string, statusCode: number, responseTime: number) {
  httpLogger.info({
    method,
    path,
    statusCode,
    responseTime: `${responseTime}ms`,
  }, 'HTTP Request completed');
}

export function logDatabaseQuery(operation: string, table: string, duration: number) {
  dbLogger.debug({
    operation,
    table,
    duration: `${duration}ms`,
  }, 'Database query executed');
}

export function logServiceOperation(service: string, operation: string, data?: any) {
  serviceLogger.info({
    service,
    operation,
    data: config.isDevelopment ? data : undefined,
  }, 'Service operation executed');
}

export function logError(error: Error, context?: string) {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: config.isDevelopment ? error.stack : undefined,
    },
    context,
  }, 'Error occurred');
}

export function logValidationError(errors: any[], context?: string) {
  logger.warn({
    validationErrors: errors,
    context,
  }, 'Validation error occurred');
}
