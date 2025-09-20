import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { registerRoutes } from './routes/index';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    }
  });

  await app.register(cors, {
    origin: (process.env.CORS_ORIGIN || process.env.API_URL || 'http://localhost:3001').split(',').map(o => o.trim()),
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 5,
    }
  });

  await registerRoutes(app);

  app.get('/health', async () => ({ status: 'healthy', ts: new Date().toISOString() }));

  return app;
}



