import { buildApp } from './app';
import { connectDatabase } from './config/database';
import { config } from './config/index';
import { logger } from './utils/logger';

async function startServer() {
  try {
    logger.info({
      environment: config.NODE_ENV,
      port: config.PORT,
      host: config.HOST,
    }, 'Starting Properties Service');
    
    // Connect to database
    await connectDatabase();
    
    // Build and configure app
    const app = await buildApp();
    
    // Start server
    console.log('🔧 DEBUG: About to start server with config:', {
      port: config.PORT,
      host: config.HOST,
      portType: typeof config.PORT,
      hostType: typeof config.HOST
    });
    
    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    
    logger.info({
      address,
      environment: config.NODE_ENV,
      pid: process.pid,
    }, '🚀 Properties Service started successfully');
    
    // Log useful information
    if (config.isDevelopment) {
      logger.info(`📊 API Documentation: ${process.env.API_URL || `http://localhost:${config.PORT}`}/api/v1/documentation`);
      logger.info(`❤️  Health Check: http://localhost:${config.PORT}/health`);
      logger.info(`🔍 API Info: http://localhost:${config.PORT}/`);
    }
    
    // Performance monitoring
    const startTime = Date.now();
    const logMemoryUsage = () => {
      const memoryUsage = process.memoryUsage();
      const uptime = Date.now() - startTime;
      
      logger.debug({
        uptime: `${Math.round(uptime / 1000)}s`,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        }
      }, 'Performance metrics');
    };
    
    // Log memory usage every 5 minutes in development
    if (config.isDevelopment) {
      setInterval(logMemoryUsage, 5 * 60 * 1000);
    }
    
  } catch (error) {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      code: (error as any).code,
      stack: error.stack,
      cause: (error as any).cause
    } : { error: String(error) };
    
    console.error('🔧 DEBUG: Full error details:', errorDetails);
    logger.fatal({ error }, '💥 Failed to start Properties Service');
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  logger.fatal({ error }, '💥 Unhandled error during server startup');
  process.exit(1);
});
