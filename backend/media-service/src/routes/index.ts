import { FastifyInstance } from 'fastify';
import { mediaRoutes } from './media.routes';

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(mediaRoutes, { prefix: '/api/v1/media' });
}



