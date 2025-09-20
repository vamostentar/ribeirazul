import { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config/index';

export async function corsHandler(request: FastifyRequest, reply: FastifyReply) {
  const origin = request.headers.origin;
  const allowedOrigins = config.CORS_ORIGIN.split(',').map(o => o.trim());
  
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
