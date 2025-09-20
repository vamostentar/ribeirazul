import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

async function start() {
  try {
    const app = await createApp();
    
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info(`🚀 Auth Service started successfully`);
    logger.info(`📍 Server listening on ${config.HOST}:${config.PORT}`);
    logger.info(`📚 Documentation available at http://localhost:${config.PORT}/docs`);
    logger.info(`🏥 Health check available at http://localhost:${config.PORT}/health`);
    logger.info(`🔧 Environment: ${config.NODE_ENV}`);
    
  } catch (error) {
    logger.error(error, '❌ Failed to start server');
    process.exit(1);
  }
}

start();