import { PrismaClient } from '@prisma/client';
import { config } from './index';

// Create Prisma client with connection pooling
export const prisma = new PrismaClient({
  datasourceUrl: config.DATABASE_URL,
  log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  // Connection pooling configuration
  // Note: These are Prisma v6+ options
  // For older versions, use connection_limit in DATABASE_URL
});

// Database connection management
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

// Graceful shutdown handler
export function setupDatabaseShutdown(): void {
  process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, shutting down database gracefully');
    await disconnectDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down database gracefully');
    await disconnectDatabase();
    process.exit(0);
  });
}

// Health check for database
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
