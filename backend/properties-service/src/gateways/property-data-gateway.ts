/**
 * Property Data Gateway - Platform Abstraction Layer
 * 
 * This interface completely isolates the business logic from persistence details.
 * Following Eskil Steenberg's principle: "Dependencies should be replaceable"
 * 
 * Can be implemented with:
 * - Prisma + PostgreSQL (current)
 * - MongoDB
 * - DynamoDB  
 * - In-memory store
 * - File system
 * - Any other persistence layer
 */

import {
    PaginatedPropertyData,
    PropertyCreateData,
    PropertyData,
    PropertyFilterData,
    PropertyId,
    PropertyStats,
    PropertyUpdateData
} from '../domain/property-types';

/**
 * Core data access interface for properties
 * Zero dependencies on external libraries or frameworks
 */
export interface PropertyDataGateway {
  /**
   * Create a new property
   * @param data Property creation data
   * @returns Created property with generated ID and timestamps
   */
  create(data: PropertyCreateData): Promise<PropertyData>;

  /**
   * Find property by ID
   * @param id Property identifier
   * @returns Property data or null if not found
   */
  findById(id: PropertyId): Promise<PropertyData | null>;

  /**
   * Find multiple properties with filters and pagination
   * @param filters Search, filter, sort and pagination criteria
   * @returns Paginated property results
   */
  findMany(filters: PropertyFilterData): Promise<PaginatedPropertyData>;

  /**
   * Update existing property
   * @param id Property identifier
   * @param data Partial property update data
   * @returns Updated property data
   * @throws Error if property not found
   */
  update(id: PropertyId, data: PropertyUpdateData): Promise<PropertyData>;

  /**
   * Delete property
   * @param id Property identifier
   * @throws Error if property not found
   */
  delete(id: PropertyId): Promise<void>;

  /**
   * Count properties matching filters
   * @param filters Optional filter criteria
   * @returns Total count
   */
  count(filters?: PropertyFilterData): Promise<number>;

  /**
   * Get properties statistics
   * @returns Aggregated statistics
   */
  getStats(): Promise<PropertyStats>;

  /**
   * Health check for data layer
   * @returns true if data layer is accessible and functional
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Gateway factory interface
 * Allows different implementations to be swapped at runtime
 */
export interface PropertyDataGatewayFactory {
  create(): PropertyDataGateway;
}

/**
 * Gateway configuration interface
 * Platform-specific configuration can be passed through this
 */
export interface GatewayConfig {
  [key: string]: any;
}

/**
 * Gateway factory creation function signature
 * Each implementation should export a function with this signature
 */
export type CreateGatewayFactory = (config: GatewayConfig) => PropertyDataGatewayFactory;