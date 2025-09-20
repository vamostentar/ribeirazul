import pino from 'pino';

/**
 * Configuração de logging usando Pino
 * Segue o padrão black box - esconde detalhes de implementação
 */
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

export const httpLogger = isDevelopment ? {
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
} : true;

export const logHelpers = {
  databaseConnection: (status: 'connected' | 'disconnected' | 'error', error?: Error) => {
    if (status === 'connected') {
      logger.info('🗄️ Database connected successfully');
    } else if (status === 'disconnected') {
      logger.info('🗄️ Database disconnected');
    } else if (status === 'error') {
      logger.error({ err: error }, '🗄️ Database connection error');
    }
  },

  serviceStart: (serviceName: string, port: number) => {
    logger.info(`🚀 ${serviceName} started on port ${port}`);
  },

  serviceStop: (serviceName: string) => {
    logger.info(`🛑 ${serviceName} stopped`);
  },

  requestStart: (method: string, url: string, requestId: string) => {
    logger.info({ method, url, requestId }, '📥 Request started');
  },

  requestEnd: (method: string, url: string, requestId: string, statusCode: number, duration: number) => {
    logger.info({ method, url, requestId, statusCode, duration }, '📤 Request completed');
  },

  error: (error: Error, context?: Record<string, any>) => {
    logger.error({ err: error, ...context }, '❌ Error occurred');
  },

  warning: (message: string, context?: Record<string, any>) => {
    logger.warn(context, `⚠️ ${message}`);
  },

  info: (message: string, context?: Record<string, any>) => {
    logger.info(context, `ℹ️ ${message}`);
  },

  success: (message: string, context?: Record<string, any>) => {
    logger.info(context, `✅ ${message}`);
  },
};