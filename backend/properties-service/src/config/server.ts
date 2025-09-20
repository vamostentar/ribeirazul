import { FastifyServerOptions } from 'fastify';
import { config } from './index';

export const serverOptions: FastifyServerOptions = {
  logger: {
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
    serializers: {
      req: (request) => ({
        method: request.method,
        url: request.url,
        path: request.routerPath,
        parameters: request.params,
        headers: {
          host: request.headers.host,
          'user-agent': request.headers['user-agent'],
          'content-type': request.headers['content-type'],
        },
      }),
      res: (reply) => ({
        statusCode: reply.statusCode,
      }),
    },
  },
  disableRequestLogging: config.isProduction,
};

export const serverConfig = {
  host: config.HOST,
  port: config.PORT,
};
