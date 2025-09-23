import { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config/index';

const normalizeOrigins = (originsRaw?: string | string[]) => {
  if (!originsRaw) return [] as string[];
  const arr = Array.isArray(originsRaw) ? originsRaw : (originsRaw as string).split(',').map(s => s.trim()).filter(Boolean);

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

export async function corsHandler(request: FastifyRequest, reply: FastifyReply) {
  const origin = request.headers.origin;
  const allowedOrigins = normalizeOrigins(config.CORS_ORIGIN);
  
  // Allow requests without origin (mobile apps, Postman, etc.)
  if (!origin) {
    reply.header('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    reply.header('Access-Control-Allow-Origin', origin);
  } else {
    reply.header('Access-Control-Allow-Origin', 'null');
  }
  
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (request.method === 'OPTIONS') {
    return reply.code(204).send();
  }
}
