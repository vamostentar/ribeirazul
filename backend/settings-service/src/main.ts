/**
 * Arquivo principal simplificado
 * Versão básica que funciona com as melhorias implementadas
 */

import { dependencyConfig } from '@/config';
import { createApp } from './app';

/**
 * Função principal de inicialização
 */
async function main() {
  try {
    dependencyConfig.observability.info('🚀 Starting Ribeira Azul Settings Service');

    // Cria aplicação Fastify
    const app = await createApp();

    // Inicia servidor
    await app.listen({
      port: 8085,
      host: '0.0.0.0',
    });

    dependencyConfig.observability.info('🎉 Ribeira Azul Settings Service started successfully!');
    dependencyConfig.observability.info('📍 Listening on 0.0.0.0:8085');
    dependencyConfig.observability.info(`📚 API Documentation: ${process.env.API_URL || `http://localhost:${process.env.PORT || 8085}`}/docs`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      dependencyConfig.observability.info(`🛑 Received ${signal}, initiating graceful shutdown`);

      try {
        await app.close();
        dependencyConfig.observability.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        dependencyConfig.observability.error('❌ Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    dependencyConfig.observability.error('💥 Failed to start Ribeira Azul Settings Service', { error });
    process.exit(1);
  }
}

// Executa aplicação
main();
