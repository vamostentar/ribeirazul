/**
 * Arquivo principal do User Service
 * Versão simplificada que funciona com as melhorias implementadas
 */

import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

/**
 * Função principal de inicialização
 */
async function main() {
  try {
    logger.info('🚀 Starting Ribeira Azul User Service');

    // Cria aplicação Fastify
    const app = await createApp();

    // Inicia servidor
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info('🎉 Ribeira Azul User Service started successfully!');
    logger.info(`📍 Listening on ${config.HOST}:${config.PORT}`);
    logger.info(`📚 API Documentation: http://localhost:${config.PORT}/docs`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`🛑 Received ${signal}, initiating graceful shutdown`);

      try {
        await app.close();
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
        }, '❌ Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, '💥 Failed to start Ribeira Azul User Service');

    process.exit(1);
  }
}

// Executa aplicação
main();
