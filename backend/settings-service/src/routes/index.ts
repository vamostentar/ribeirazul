import { FastifyInstance } from 'fastify';
import { backupRoutes } from './backup.routes';
import { healthRoutes } from './health.routes';
import { moduleSettingsRoutes } from './module-settings.routes';
import { settingsRoutes } from './settings.routes';

/**
 * Registra todas as rotas do settings service
 */
export async function registerRoutes(fastify: FastifyInstance) {
  // Registrar rotas principais de configurações
  await fastify.register(settingsRoutes, { prefix: '/api/v1' });
  
  // Registrar rotas de health check
  await fastify.register(healthRoutes, { prefix: '/api/v1' });
  
  // Registrar rotas de configurações de módulo
  await fastify.register(moduleSettingsRoutes, { prefix: '/api/v1' });
  
  // Registrar rotas de backup e restauração
  await fastify.register(backupRoutes, { prefix: '/api/v1' });
}
