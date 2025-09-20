/**
 * Property Core - Business Logic Layer
 * 
 * Contains all business rules and validations
 * Following Eskil Steenberg's principle: "Business logic should be pure and testable"
 * 
 * Zero dependencies on external frameworks, databases, or HTTP
 */

import {
    PaginatedPropertyData,
    PropertyCreateData,
    PropertyData,
    PropertyFilterData,
    PropertyId,
    PropertyStats,
    PropertyUpdateData,
    PropertyWithComputedFields
} from '../domain/property-types';
import { PropertyDataGateway } from '../gateways/property-data-gateway';

/**
 * Business rule validation errors
 */
export class PropertyValidationError extends Error {
  constructor(message: string, public readonly field?: string, public readonly code?: string) {
    super(message);
    this.name = 'PropertyValidationError';
  }
}

export class PropertyNotFoundError extends Error {
  constructor(id: string) {
    super(`Property with ID ${id} not found`);
    this.name = 'PropertyNotFoundError';
  }
}

/**
 * Business configuration
 * Can be injected from outside for different environments
 */
export interface PropertyBusinessConfig {
  maxPrice: number;
  maxArea: number;
  maxTitleLength: number;
  maxDescriptionLength: number;
  maxFeatures: number;
  minSearchQueryLength: number;
  maxSearchRadius: number;
}

/**
 * Default business configuration
 */
export const DEFAULT_BUSINESS_CONFIG: PropertyBusinessConfig = {
  maxPrice: 100_000_000, // €100M
  maxArea: 50_000, // 50,000 m²
  maxTitleLength: 200,
  maxDescriptionLength: 2000,
  maxFeatures: 20,
  minSearchQueryLength: 3,
  maxSearchRadius: 100, // 100km
};

/**
 * Property Core - Pure Business Logic
 */
export class PropertyCore {
  constructor(
    private readonly gateway: PropertyDataGateway,
    private readonly config: PropertyBusinessConfig = DEFAULT_BUSINESS_CONFIG
  ) {}

  /**
   * Create a new property with full business validation
   */
  async createProperty(data: PropertyCreateData): Promise<PropertyWithComputedFields> {
    // Business validation
    this.validatePropertyData(data);
    
    // Create property
    const property = await this.gateway.create(data);
    
    // Return with computed fields
    return this.addComputedFields(property);
  }

  /**
   * Get property by ID
   */
  async getProperty(id: PropertyId): Promise<PropertyWithComputedFields> {
    this.validatePropertyId(id);
    
    const property = await this.gateway.findById(id);
    if (!property) {
      throw new PropertyNotFoundError(id);
    }
    
    return this.addComputedFields(property);
  }

  /**
   * Search properties with filters and pagination
   */
  async searchProperties(filters: PropertyFilterData): Promise<PaginatedPropertyData> {
    // Validate and normalize filters
    const validatedFilters = this.validateAndNormalizeFilters(filters);
    
    // Execute search through gateway
    const result = await this.gateway.findMany(validatedFilters);
    
    return result; // Gateway already returns PropertyWithComputedFields
  }

  /**
   * Update existing property
   */
  async updateProperty(id: PropertyId, data: PropertyUpdateData): Promise<PropertyWithComputedFields> {
    this.validatePropertyId(id);
    this.validatePropertyUpdateData(data);
    
    try {
      const property = await this.gateway.update(id, data);
      return this.addComputedFields(property);
    } catch (error: any) {
      if (error.message?.includes('not found') || error.code === 'P2025') {
        throw new PropertyNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Delete property
   */
  async deleteProperty(id: PropertyId): Promise<void> {
    this.validatePropertyId(id);
    
    try {
      await this.gateway.delete(id);
    } catch (error: any) {
      if (error.message?.includes('not found') || error.code === 'P2025') {
        throw new PropertyNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Get properties statistics
   */
  async getStats(): Promise<PropertyStats> {
    return await this.gateway.getStats();
  }

  /**
   * Text search properties
   */
  async searchByText(query: string, limit: number = 20): Promise<PropertyWithComputedFields[]> {
    if (!query || query.trim().length < this.config.minSearchQueryLength) {
      throw new PropertyValidationError(
        `Search query must be at least ${this.config.minSearchQueryLength} characters long`,
        'query'
      );
    }

    const filters: PropertyFilterData = {
      textQuery: query.trim(),
      limit: Math.min(limit, 100), // Cap at 100
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await this.gateway.findMany(filters);
    return result.properties;
  }

  /**
   * Find nearby properties
   */
  async findNearbyProperties(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 20
  ): Promise<PropertyWithComputedFields[]> {
    // Validate coordinates
    this.validateCoordinates(latitude, longitude);
    
    if (radiusKm <= 0 || radiusKm > this.config.maxSearchRadius) {
      throw new PropertyValidationError(
        `Search radius must be between 0 and ${this.config.maxSearchRadius} kilometers`,
        'radius'
      );
    }

    const filters: PropertyFilterData = {
      nearbySearch: {
        latitude,
        longitude,
        radiusKm,
      },
      limit: Math.min(limit, 100), // Cap at 100
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await this.gateway.findMany(filters);
    return result.properties;
  }

  /**
   * Count properties matching criteria
   */
  async countProperties(filters?: PropertyFilterData): Promise<number> {
    const validatedFilters = filters ? this.validateAndNormalizeFilters(filters) : undefined;
    return await this.gateway.count(validatedFilters);
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    return await this.gateway.isHealthy();
  }

  // ==================== PRIVATE VALIDATION METHODS ====================

  private validatePropertyId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new PropertyValidationError('Property ID is required', 'id');
    }
    
    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new PropertyValidationError('Property ID must be a valid UUID', 'id');
    }
  }

  private validatePropertyData(data: PropertyCreateData): void {
    // Title validation
    if (!data.title || data.title.trim().length === 0) {
      throw new PropertyValidationError('Title is required', 'title');
    }
    if (data.title.length > this.config.maxTitleLength) {
      throw new PropertyValidationError(
        `Title must not exceed ${this.config.maxTitleLength} characters`,
        'title'
      );
    }

    // Location validation
    if (!data.location || data.location.trim().length === 0) {
      throw new PropertyValidationError('Location is required', 'location');
    }
    if (data.location.length < 5) {
      throw new PropertyValidationError('Location must be at least 5 characters', 'location');
    }

    // Price validation
    if (data.price <= 0) {
      throw new PropertyValidationError('Price must be positive', 'price');
    }
    if (data.price > this.config.maxPrice) {
      throw new PropertyValidationError(
        `Price cannot exceed €${this.config.maxPrice.toLocaleString()}`,
        'price'
      );
    }

    // Optional fields validation
    if (data.description && data.description.length > this.config.maxDescriptionLength) {
      throw new PropertyValidationError(
        `Description must not exceed ${this.config.maxDescriptionLength} characters`,
        'description'
      );
    }

    if (data.area !== undefined && (data.area <= 0 || data.area > this.config.maxArea)) {
      throw new PropertyValidationError(
        `Area must be between 0 and ${this.config.maxArea} m²`,
        'area'
      );
    }

    if (data.yearBuilt !== undefined) {
      const currentYear = new Date().getFullYear();
      if (data.yearBuilt < 1800 || data.yearBuilt > currentYear) {
        throw new PropertyValidationError(
          `Year built must be between 1800 and ${currentYear}`,
          'yearBuilt'
        );
      }
    }

    if (data.bedrooms !== undefined && (data.bedrooms < 0 || data.bedrooms > 20)) {
      throw new PropertyValidationError('Bedrooms must be between 0 and 20', 'bedrooms');
    }

    if (data.bathrooms !== undefined && (data.bathrooms < 0 || data.bathrooms > 20)) {
      throw new PropertyValidationError('Bathrooms must be between 0 and 20', 'bathrooms');
    }

    if (data.coordinates) {
      this.validateCoordinates(data.coordinates.latitude, data.coordinates.longitude);
    }

    if (data.features && data.features.length > this.config.maxFeatures) {
      throw new PropertyValidationError(
        `Cannot have more than ${this.config.maxFeatures} features`,
        'features'
      );
    }
  }

  private validatePropertyUpdateData(data: PropertyUpdateData): void {
    // Similar validations but all optional
    if (data.title !== undefined) {
      if (data.title.trim().length === 0) {
        throw new PropertyValidationError('Title cannot be empty', 'title');
      }
      if (data.title.length > this.config.maxTitleLength) {
        throw new PropertyValidationError(
          `Title must not exceed ${this.config.maxTitleLength} characters`,
          'title'
        );
      }
    }

    if (data.price !== undefined) {
      if (data.price <= 0) {
        throw new PropertyValidationError('Price must be positive', 'price');
      }
      if (data.price > this.config.maxPrice) {
        throw new PropertyValidationError(
          `Price cannot exceed €${this.config.maxPrice.toLocaleString()}`,
          'price'
        );
      }
    }

    // Apply similar validation logic for other optional fields...
    // (Similar to validatePropertyData but for optional fields)
    
    if (data.coordinates) {
      this.validateCoordinates(data.coordinates.latitude, data.coordinates.longitude);
    }
  }

  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new PropertyValidationError('Latitude must be between -90 and 90', 'latitude');
    }
    if (longitude < -180 || longitude > 180) {
      throw new PropertyValidationError('Longitude must be between -180 and 180', 'longitude');
    }
  }

  private validateAndNormalizeFilters(filters: PropertyFilterData): PropertyFilterData {
    const normalized: PropertyFilterData = { ...filters };

    // Normalize limit
    if (normalized.limit === undefined) {
      normalized.limit = 20;
    }
    normalized.limit = Math.max(1, Math.min(normalized.limit, 100)); // Between 1 and 100

    // Validate price range
    if (normalized.minPrice !== undefined && normalized.maxPrice !== undefined) {
      if (normalized.minPrice >= normalized.maxPrice) {
        throw new PropertyValidationError('minPrice must be less than maxPrice', 'price');
      }
    }

    // Validate area range
    if (normalized.minArea !== undefined && normalized.maxArea !== undefined) {
      if (normalized.minArea >= normalized.maxArea) {
        throw new PropertyValidationError('minArea must be less than maxArea', 'area');
      }
    }

    // Validate nearby search
    if (normalized.nearbySearch) {
      this.validateCoordinates(
        normalized.nearbySearch.latitude,
        normalized.nearbySearch.longitude
      );
      
      if (normalized.nearbySearch.radiusKm <= 0 || normalized.nearbySearch.radiusKm > this.config.maxSearchRadius) {
        throw new PropertyValidationError(
          `Search radius must be between 0 and ${this.config.maxSearchRadius} kilometers`,
          'radius'
        );
      }
    }

    // Normalize sorting
    if (!normalized.sortBy) normalized.sortBy = 'createdAt';
    if (!normalized.sortOrder) normalized.sortOrder = 'desc';

    return normalized;
  }

  private addComputedFields(property: PropertyData): PropertyWithComputedFields {
    const currentYear = new Date().getFullYear();
    
    const pricePerSqm = property.price && property.area 
      ? property.price / property.area
      : null;
      
    const propertyAge = property.yearBuilt 
      ? currentYear - property.yearBuilt 
      : null;

    return {
      ...property,
      pricePerSqm,
      propertyAge,
    };
  }
}

/**
 * Factory function for PropertyCore
 * Simple dependency injection without complex frameworks
 */
export function createPropertyCore(
  gateway: PropertyDataGateway, 
  config?: PropertyBusinessConfig
): PropertyCore {
  return new PropertyCore(gateway, config);
}