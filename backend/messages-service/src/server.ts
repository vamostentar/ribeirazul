import { registerMessageRoutes } from '@/routes/messages';
import { config } from '@/utils/config';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

export async function buildServer() {
  const app = Fastify({
    logger: config.NODE_ENV === 'production' ? { level: config.LOG_LEVEL } : {
      level: config.LOG_LEVEL,
      transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss Z' } }
    }
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet, { global: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  await registerMessageRoutes(app);

  app.get('/health', async () => ({ status: 'healthy' }));

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  buildServer()
    .then((app) => app.listen({ host: config.HOST, port: config.PORT }))
    .then((addr) => console.log(`Messages Service listening on ${addr}`))
    .catch((err) => { console.error(err); process.exit(1); });
}


