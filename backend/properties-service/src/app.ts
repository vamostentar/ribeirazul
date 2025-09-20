import cors from '@fastify/cors';
import Fastify from 'fastify';
import path from 'path';
import { prisma } from './config/database';
import { config } from './config/index';
import { ServiceFactory } from './factories/service.factory';
import { registerRoutes } from './routes/index.js';
import { serviceLogger } from './utils/logger';

export async function buildApp() {
  try {
    serviceLogger.info('Building properties service application');

    // Initialize service factory
    const serviceFactory = ServiceFactory.getInstance();
    await serviceFactory.initialize();

    // Create Fastify instance
    const app = Fastify({
      logger: {
        level: 'info',
        transport: config.isDevelopment ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          }
        } : undefined
      }
    });

    // Register CORS
    await app.register(cors, {
      origin: config.CORS_ORIGIN.split(',').map(origin => origin.trim()),
      credentials: true,
    });

    // Register Prisma client
    app.decorate('prisma', prisma);

    // Register multipart for file uploads with enhanced security
    await app.register(import('@fastify/multipart'), {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max per file
        files: 10, // Max 5 files per request
        fields: 10, // Max 10 text fields
        fieldSize: 1024 * 1024, // 5MB max per field
        fieldNameSize: 100, // Max 100 chars for field names
        headerPairs: 2000, // Max header pairs
      },
      // Security options
      throwFileSizeLimit: true,
    });

    // Register static files for serving uploaded images
    // Use absolute path to match storage service configuration
    const uploadsPath = path.resolve('/app/uploads');
    await app.register(import('@fastify/static'), {
      root: uploadsPath,
      prefix: '/uploads/',
    });
    
    serviceLogger.info(`Static files configured: ${uploadsPath} -> /uploads/`);

    // Health check routes are now managed by the dedicated health module

    // Register all routes (includes /api/v1 prefix)
    await registerRoutes(app);

    // Graceful shutdown
    app.addHook('onClose', async () => {
      serviceLogger.info('Application shutting down, cleaning up services...');
      try {
        await serviceFactory.shutdown();
        serviceLogger.info('Services cleanup completed');
      } catch (error) {
        serviceLogger.error({ error }, 'Error during services cleanup');
      }
    });

    serviceLogger.info('Properties service application built successfully');
    return app;
  } catch (error) {
    serviceLogger.error({ error }, 'Failed to build properties service application');
    throw error;
  }
}
