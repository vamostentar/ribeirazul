import { PrismaDatabaseConnection } from '../implementations/database/prisma-database';
import { PrismaPropertyRepository } from '../implementations/repositories/prisma-property-repository';
import { LocalEventBus } from '../implementations/services/local-event-bus';
import { LocalMediaService } from '../implementations/services/local-media-service';
import { PropertyServiceImpl } from '../implementations/services/property-service-impl';
import { IEventBus, IMediaService, IPropertyRepository, IPropertyService, IServiceFactory } from '../interfaces';
import { serviceLogger } from '../utils/logger';

export class ServiceFactory implements IServiceFactory {
  private static instance: ServiceFactory;
  private databaseConnection: PrismaDatabaseConnection;
  private eventBus: LocalEventBus;
  private mediaService: LocalMediaService;

  private constructor() {
    this.databaseConnection = new PrismaDatabaseConnection();
    this.eventBus = new LocalEventBus();
    this.mediaService = new LocalMediaService();
  }

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  async initialize(): Promise<void> {
    try {
      serviceLogger.info('Initializing service factory');
      
      // Connect to database
      await this.databaseConnection.connect();
      
      // Verify database health
      const isHealthy = await this.databaseConnection.isHealthy();
      if (!isHealthy) {
        throw new Error('Database connection is not healthy');
      }

      // Setup event handlers
      this.setupEventHandlers();
      
      serviceLogger.info('Service factory initialized successfully');
    } catch (error) {
      serviceLogger.error({ error }, 'Failed to initialize service factory');
      throw error;
    }
  }

  createPropertyService(): IPropertyService {
    try {
      const propertyRepository = this.createPropertyRepository();
      const mediaService = this.createMediaService();
      const eventBus = this.createEventBus();

      const propertyService = new PropertyServiceImpl(
        propertyRepository,
        mediaService,
        eventBus
      );

      serviceLogger.debug('Property service created successfully');
      return propertyService;
    } catch (error) {
      serviceLogger.error({ error }, 'Failed to create property service');
      throw error;
    }
  }

  createPropertyRepository(): IPropertyRepository {
    try {
      const prismaClient = this.databaseConnection.getClient();
      const propertyRepository = new PrismaPropertyRepository(prismaClient);
      
      serviceLogger.debug('Property repository created successfully');
      return propertyRepository;
    } catch (error) {
      serviceLogger.error({ error }, 'Failed to create property repository');
      throw error;
    }
  }

  createMediaService(): IMediaService {
    return this.mediaService;
  }

  createEventBus(): IEventBus {
    return this.eventBus;
  }

  // Method to create the complete property service with all dependencies
  createCompletePropertyService(): PropertyServiceImpl {
    try {
      const propertyRepository = this.createPropertyRepository();
      const mediaService = this.createMediaService();
      const eventBus = this.createEventBus();

      const propertyService = new PropertyServiceImpl(
        propertyRepository,
        mediaService,
        eventBus
      );

      serviceLogger.debug('Complete property service created successfully');
      return propertyService;
    } catch (error) {
      serviceLogger.error({ error }, 'Failed to create complete property service');
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Subscribe to property events for logging and monitoring
    this.eventBus.subscribe('property.created', async (data) => {
      serviceLogger.info({ event: 'property.created', propertyId: data.id }, 'Property creation event received');
    });

    this.eventBus.subscribe('property.updated', async (data) => {
      serviceLogger.info({ event: 'property.updated', propertyId: data.id }, 'Property update event received');
    });

    this.eventBus.subscribe('property.deleted', async (data) => {
      serviceLogger.info({ event: 'property.deleted', propertyId: data.id }, 'Property deletion event received');
    });
  }

  async shutdown(): Promise<void> {
    try {
      serviceLogger.info('Shutting down service factory');
      
      // Disconnect from database
      await this.databaseConnection.disconnect();
      
      serviceLogger.info('Service factory shutdown completed');
    } catch (error) {
      serviceLogger.error({ error }, 'Error during service factory shutdown');
      throw error;
    }
  }

  // Getter for database connection (useful for health checks)
  getDatabaseConnection(): PrismaDatabaseConnection {
    return this.databaseConnection;
  }
}
