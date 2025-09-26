import { CacheService } from '@/services/cache.service';
import { CircuitBreakerService } from '@/services/circuit-breaker.service';
import { EmailService } from '@/services/email.service';
import { HealthService } from '@/services/health.service';
import { ImapService } from '@/services/imap.service';
import { MessageService } from '@/services/message.service';
import { MetricsService } from '@/services/metrics.service';
import { config, configService } from '@/utils/config';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Container interface for type safety
export interface Container {
  // Configuration
  config: typeof config;
  configService: typeof configService;
  logger: typeof logger;

  // Database
  prisma: PrismaClient;

  // Cache & Queue
  redis?: Redis;
  emailQueue?: Queue;
  emailWorker?: Worker;

  // Services
  messageService: MessageService;
  emailService: EmailService;
  imapService: ImapService;
  metricsService: MetricsService;
  healthService: HealthService;
  cacheService: CacheService;
  circuitBreakerService: CircuitBreakerService;
}

// Create the container
export const container = createContainer<Container>({
  injectionMode: InjectionMode.PROXY,
});

// Register configuration
container.register({
  config: asValue(config),
  configService: asValue(configService),
  logger: asValue(logger),
});

// Register Prisma with connection pooling
container.register({
  prisma: asFunction(() => {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.DATABASE_URL,
        },
      },
      log: configService.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Connection pool configuration
    prisma.$connect().catch((error) => {
      logger.error('Failed to connect to database', { error: error.message });
      process.exit(1);
    });

    return prisma;
  }).singleton(),
});

// Register Redis if configured
if (config.REDIS_URL) {
  container.register({
    redis: asFunction(() => {
      const redis = new Redis(config.REDIS_URL!, {
        password: config.REDIS_PASSWORD,
        db: config.REDIS_DB,
        maxRetriesPerRequest: config.REDIS_MAX_RETRIES,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      redis.on('error', (error) => {
        logger.error('Redis connection error', { error: error.message });
      });

      redis.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      return redis;
    }).singleton(),
  });

  // Register email queue and worker
  container.register({
    emailQueue: asFunction(({ redis }) => {
      return new Queue('email', {
        connection: redis,
        defaultJobOptions: {
          attempts: config.QUEUE_MAX_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: config.QUEUE_BACKOFF_DELAY,
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      });
    }).singleton(),

    emailWorker: asFunction(({ redis, emailService, logger }) => {
      return new Worker(
        'email',
        async (job) => {
          const startTime = Date.now();
          const jobLogger = logger.child({ jobId: job.id, jobName: job.name });
          
          try {
            jobLogger.info('Processing email job', { data: job.data });
            
            await emailService.sendEmail(job.data);
            
            const duration = Date.now() - startTime;
            jobLogger.performance('email_job_completed', duration, { jobId: job.id });
            
            return { success: true, duration };
          } catch (error: any) {
            const duration = Date.now() - startTime;
            jobLogger.error('Email job failed', { 
              error: error.message, 
              duration, 
              jobId: job.id 
            });
            throw error;
          }
        },
        {
          connection: redis,
          concurrency: config.QUEUE_CONCURRENCY,
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        }
      );
    }).singleton(),
  });
}

// Register services
container.register({
  // Core services
  messageService: asClass(MessageService).singleton(),
  emailService: asClass(EmailService).singleton(),
  imapService: asClass(ImapService).singleton(),
  
  // Infrastructure services
  metricsService: asClass(MetricsService).singleton(),
  healthService: asClass(HealthService).singleton(),
  cacheService: asClass(CacheService).singleton(),
  circuitBreakerService: asClass(CircuitBreakerService).singleton(),
});

// Graceful shutdown handler
export async function shutdownContainer(): Promise<void> {
  logger.info('Shutting down container...');
  
  try {
    const { prisma, redis, emailQueue, emailWorker } = container.cradle;
    
    // Close worker first
    if (emailWorker) {
      logger.info('Closing email worker...');
      await emailWorker.close();
    }
    
    // Close queue
    if (emailQueue) {
      logger.info('Closing email queue...');
      await emailQueue.close();
    }
    
    // Close Redis connection
    if (redis) {
      logger.info('Closing Redis connection...');
      redis.disconnect();
    }
    
    // Close Prisma connection
    logger.info('Closing database connection...');
    await prisma.$disconnect();
    
    logger.info('Container shutdown complete');
  } catch (error: any) {
    logger.error('Error during container shutdown', { error: error.message });
    throw error;
  }
}

// Export container instance
export default container;
