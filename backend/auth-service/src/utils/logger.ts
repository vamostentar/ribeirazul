import { config } from '@/config';
import type { RequestContext } from '@/types/common';
import pino from 'pino';

// Create base logger
const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
  },
});

// HTTP request logger
export const httpLogger = pino({
  ...logger.bindings(),
  level: config.LOG_LEVEL,
  transport: config.isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname,req,res,responseTime'
    }
  } : undefined,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Audit logger for security events
export const auditLogger = pino({
  ...logger.bindings(),
  level: 'info',
  name: 'audit',
  transport: config.isDevelopment ? undefined : {
    target: 'pino/file',
    options: {
      destination: './logs/audit.log',
      mkdir: true,
    }
  },
});

// Security logger for security-specific events
export const securityLogger = pino({
  ...logger.bindings(),
  level: 'warn',
  name: 'security',
  transport: config.isDevelopment ? undefined : {
    target: 'pino/file',
    options: {
      destination: './logs/security.log',
      mkdir: true,
    }
  },
});

// Performance logger for monitoring
export const performanceLogger = pino({
  ...logger.bindings(),
  level: 'info',
  name: 'performance',
});

// Create contextual logger that includes request context
export function createContextualLogger(context: RequestContext) {
  return logger.child({
    requestId: context.requestId,
    correlationId: context.correlationId,
    userId: context.userId,
    userRole: context.userRole,
    ipAddress: context.ipAddress,
    endpoint: context.endpoint,
    method: context.method,
  });
}

// Helper functions for structured logging
export const logHelpers = {
  // Authentication events
  loginSuccess: (userId: string, context: RequestContext) => {
    auditLogger.info({
      action: 'auth.login.success',
      userId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    }, 'User login successful');
  },

  loginFailed: (email: string, reason: string, context: RequestContext) => {
    securityLogger.warn({
      action: 'auth.login.failed',
      email,
      reason,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    }, 'Login attempt failed');
  },

  logout: (userId: string, context: RequestContext) => {
    auditLogger.info({
      action: 'auth.logout',
      userId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    }, 'User logout');
  },

  // Security events
  accountLocked: (email: string, attempts: number, context: RequestContext) => {
    securityLogger.error({
      action: 'security.account_locked',
      email,
      attempts,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    }, 'Account locked due to too many failed login attempts');
  },

  suspiciousActivity: (userId: string, activity: string, context: RequestContext, metadata?: any) => {
    securityLogger.error({
      action: 'security.suspicious_activity',
      userId,
      activity,
      metadata,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    }, 'Suspicious activity detected');
  },

  tokenBlacklisted: (jti: string, reason: string, userId?: string) => {
    securityLogger.warn({
      action: 'security.token_blacklisted',
      jti,
      reason,
      userId,
    }, 'JWT token blacklisted');
  },

  // User management events
  userCreated: (userId: string, createdBy: string, context: RequestContext) => {
    auditLogger.info({
      action: 'user.created',
      userId,
      createdBy,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    }, 'User account created');
  },

  userUpdated: (userId: string, updatedBy: string, changes: any, context: RequestContext) => {
    auditLogger.info({
      action: 'user.updated',
      userId,
      updatedBy,
      changes,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    }, 'User account updated');
  },

  userDeleted: (userId: string, deletedBy: string, context: RequestContext) => {
    auditLogger.warn({
      action: 'user.deleted',
      userId,
      deletedBy,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    }, 'User account deleted');
  },

  // Role management events
  roleCreated: (roleId: string, roleName: string, createdBy: string, context: RequestContext) => {
    auditLogger.info({
      action: 'role.created',
      roleId,
      roleName,
      createdBy,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    }, 'Role created');
  },

  roleUpdated: (roleId: string, roleName: string, updatedBy: string, changes: any, context: RequestContext) => {
    auditLogger.info({
      action: 'role.updated',
      roleId,
      roleName,
      updatedBy,
      changes,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    }, 'Role updated');
  },

  // Performance events
  slowQuery: (query: string, duration: number, context: RequestContext) => {
    performanceLogger.warn({
      action: 'performance.slow_query',
      query,
      duration,
      requestId: context.requestId,
    }, `Slow database query detected: ${duration}ms`);
  },

  slowRequest: (endpoint: string, method: string, duration: number, context: RequestContext) => {
    performanceLogger.warn({
      action: 'performance.slow_request',
      endpoint,
      method,
      duration,
      requestId: context.requestId,
    }, `Slow request detected: ${duration}ms`);
  },

  // System events
  systemError: (error: Error, context?: RequestContext) => {
    logger.error({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
    }, 'System error occurred');
  },

  databaseConnection: (status: 'connected' | 'disconnected' | 'error', error?: Error) => {
    if (status === 'connected') {
      logger.info({ action: 'database.connected' }, '✅ Database connected successfully');
    } else if (status === 'disconnected') {
      logger.warn({ action: 'database.disconnected' }, '⚠️ Database disconnected');
    } else {
      logger.error({
        action: 'database.error',
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      }, '❌ Database connection error');
    }
  },

  redisConnection: (status: 'connected' | 'disconnected' | 'error', error?: Error) => {
    if (status === 'connected') {
      logger.info({ action: 'redis.connected' }, '✅ Redis connected successfully');
    } else if (status === 'disconnected') {
      logger.warn({ action: 'redis.disconnected' }, '⚠️ Redis disconnected');
    } else {
      logger.error({
        action: 'redis.error',
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      }, '❌ Redis connection error');
    }
  },
};

// Middleware logger for HTTP requests
export function createRequestLogger() {
  return {
    logRequest: (request: any, reply: any, done: Function) => {
      const start = Date.now();
      
      reply.addHook('onSend', (request: any, reply: any, payload: any, done: Function) => {
        const duration = Date.now() - start;
        
        httpLogger.info({
          req: request,
          res: reply,
          responseTime: duration,
          requestId: request.requestContext?.requestId,
          userId: request.user?.id,
        });

        // Log slow requests
        if (duration > 1000) { // More than 1 second
          logHelpers.slowRequest(
            request.url,
            request.method,
            duration,
            request.requestContext
          );
        }

        done();
      });

      done();
    }
  };
}

export { logger };
export default logger;
