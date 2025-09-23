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

  const normalizeOrigins = (raw?: string | string[]) => {
    const corsVar = raw || process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || process.env.API_URL || '';
    const arr = (typeof corsVar === 'string' ? corsVar.split(',') : corsVar).map((s: string) => s.trim()).filter(Boolean);
    const normalized = new Set<string>();
    for (const o of arr) {
      try {
        const u = new URL(o);
        normalized.add(u.origin);
        const host = u.hostname;
        if (host.startsWith('www.')) {
          normalized.add(`${u.protocol}//${host.replace(/^www\./, '')}`);
        } else {
          normalized.add(`${u.protocol}//www.${host}`);
        }
      } catch (e) {
        if (typeof o === 'string' && o.length) normalized.add(o);
      }
    }
    return Array.from(normalized);
  };

  await app.register(cors, {
    origin: normalizeOrigins(process.env.CORS_ORIGIN),
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



