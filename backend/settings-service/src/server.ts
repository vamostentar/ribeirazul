import { config, dependencyConfig } from '@/config';
import { createApp } from './app';

/**
 * Arquivo principal do servidor
 * Inicializa e executa a aplicação
 */
async function main() {
  try {
    dependencyConfig.observability.info('🚀 Iniciando Ribeira Azul Settings Service');

    // Criar aplicação Fastify
    const app = await createApp();

    // Iniciar servidor
    await app.listen({
      port: config.config.PORT,
      host: config.config.HOST,
    });

    dependencyConfig.observability.info('🎉 Ribeira Azul Settings Service iniciado com sucesso!');
    dependencyConfig.observability.info(`📍 Escutando em ${config.config.HOST}:${config.config.PORT}`);
    dependencyConfig.observability.info(`📚 Documentação da API: ${process.env.API_URL || `http://localhost:${process.env.PORT || 8085}`}/docs`);
    dependencyConfig.observability.info(`🔍 Health Check: ${process.env.API_URL || `http://localhost:${process.env.PORT || 8085}`}/api/v1/health`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      dependencyConfig.observability.info(`🛑 Recebido ${signal}, iniciando encerramento graceful`);

      try {
        await app.close();
        dependencyConfig.observability.info('✅ Encerramento graceful concluído');
        process.exit(0);
      } catch (error) {
        dependencyConfig.observability.error('❌ Erro durante encerramento', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    dependencyConfig.observability.error('💥 Falha ao iniciar Ribeira Azul Settings Service', { error });
    process.exit(1);
  }
}

// Executar aplicação
main();
