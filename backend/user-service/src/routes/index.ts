import { FastifyInstance } from 'fastify';
import { userRoutes } from './user.routes.js';

export async function registerRoutes(fastify: FastifyInstance) {
  console.log('🔧 Registrando todas as rotas do User Service...');
  
  // Registrar rotas do user service
  await fastify.register(userRoutes);
  
  console.log('✅ Todas as rotas do User Service registradas com sucesso');
}