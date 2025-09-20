/**
 * Arquivo principal simplificado
 * Versão básica que funciona com as melhorias implementadas
 */

import { createApp } from './app';
import { logger } from './utils/logger';

/**
 * Função principal de inicialização
 */
async function main() {
  try {
    logger.info('🚀 Starting Ribeira Azul Auth Service');

    // Cria aplicação Fastify
    const app = await createApp();

    // Inicia servidor
    await app.listen({
      port: 8084,
      host: '0.0.0.0',
    });

    logger.info('🎉 Ribeira Azul Auth Service started successfully!');
    logger.info('📍 Listening on 0.0.0.0:8084');
    logger.info(`📚 API Documentation: ${process.env.API_URL || `http://localhost:${process.env.PORT || 8084}`}/docs`);

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
    }, '💥 Failed to start Ribeira Azul Auth Service');

    process.exit(1);
  }
}

// Executa aplicação
main();
