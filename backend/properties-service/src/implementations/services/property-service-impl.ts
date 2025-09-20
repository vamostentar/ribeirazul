import { IEventBus, IMediaService, IPropertyRepository } from '../../interfaces';
import { NotFoundError, PaginatedResponse, ValidationError } from '../../types/common';
import { PropertyCreateInput, PropertyFilters, PropertyResponse, PropertyUpdateInput } from '../../types/property';
import { serviceLogger } from '../../utils/logger';
import {
    validateAreaRange,
    validateBathroomRange,
    validateBedroomRange,
    validateCoordinates,
    validatePriceRange,
    validateYearRange
} from '../../utils/validation';

export class PropertyServiceImpl {
  constructor(
    private propertyRepository: IPropertyRepository,
    private mediaService: IMediaService,
    private eventBus: IEventBus
  ) {}

  async createProperty(data: PropertyCreateInput): Promise<PropertyResponse> {
    serviceLogger.info({ operation: 'createProperty', data: { title: data.title } }, 'Creating property');
    
    try {
      // Additional business validations
      await this.validateBusinessRules(data);
      
      const property = await this.propertyRepository.create(data);
      
      // Publish event for other services
      await this.eventBus.publish('property.created', property);
      
      serviceLogger.info({ 
        operation: 'createProperty', 
        propertyId: property.id,
        title: property.title 
      }, 'Property created successfully');
      
      return property;
    } catch (error) {
      serviceLogger.error({ error, operation: 'createProperty' }, 'Failed to create property');
      throw error;
    }
  }

  async getPropertyById(id: string): Promise<PropertyResponse> {
    serviceLogger.debug({ operation: 'getPropertyById', id }, 'Fetching property by ID');
    
    try {
      const property = await this.propertyRepository.findById(id);
      
      if (!property) {
        throw new NotFoundError('Property', id);
      }
      
      serviceLogger.debug({ 
        operation: 'getPropertyById', 
        propertyId: property.id,
        found: true 
      }, 'Property found');
      
      return property;
    } catch (error) {
      serviceLogger.error({ error, operation: 'getPropertyById', id }, 'Failed to get property by ID');
      throw error;
    }
  }

  async getProperties(filters: PropertyFilters): Promise<PaginatedResponse<PropertyResponse>> {
    serviceLogger.info({ operation: 'getProperties', filters }, 'Fetching properties with filters');
    
    try {
      // Validate filter combinations
      this.validateFilters(filters);
      
      // Fetch one extra to determine if there are more results
      const limitPlusOne = filters.limit + 1;
      const filtersWithExtraLimit = { ...filters, limit: limitPlusOne };
      
      const properties = await this.propertyRepository.findMany(filtersWithExtraLimit);
      
      // Determine if there are more results
      let nextCursor: string | null = null;
      let hasMore = false;
      
      if (properties.length > filters.limit) {
        const lastProperty = properties.pop(); // Remove the extra item
        nextCursor = lastProperty?.id || null;
        hasMore = true;
      }
      
      // Get total count estimate for better UX
      let totalEstimate: number | undefined;
      if (filters.cursor === undefined && properties.length > 0) {
        try {
          totalEstimate = await this.propertyRepository.count(filters);
        } catch {
          totalEstimate = undefined;
        }
      }
      
      const result: PaginatedResponse<PropertyResponse> = {
        data: properties,
        pagination: {
          nextCursor,
          hasMore,
          limit: filters.limit,
          totalEstimate,
        },
      };
      
      serviceLogger.info({ 
        operation: 'getProperties', 
        count: properties.length,
        hasMore,
        filters 
      }, 'Properties fetched successfully');
      
      return result;
    } catch (error) {
      serviceLogger.error({ error, operation: 'getProperties', filters }, 'Failed to get properties');
      throw error;
    }
  }

  async updateProperty(id: string, data: PropertyUpdateInput): Promise<PropertyResponse> {
    serviceLogger.info({ operation: 'updateProperty', id, data: { title: data.title } }, 'Updating property');
    
    try {
      // Check if property exists
      const existingProperty = await this.propertyRepository.findById(id);
      if (!existingProperty) {
        throw new NotFoundError('Property', id);
      }
      
      // Validate business rules for updates
      if (data.price !== undefined || data.area !== undefined) {
        await this.validateBusinessRules({ ...existingProperty, ...data } as PropertyCreateInput);
      }
      
      const updatedProperty = await this.propertyRepository.update(id, data);
      
      // Publish event for other services
      await this.eventBus.publish('property.updated', updatedProperty);
      
      serviceLogger.info({ 
        operation: 'updateProperty', 
        propertyId: id,
        title: updatedProperty.title 
      }, 'Property updated successfully');
      
      return updatedProperty;
    } catch (error) {
      serviceLogger.error({ error, operation: 'updateProperty', id }, 'Failed to update property');
      throw error;
    }
  }

  async deleteProperty(id: string): Promise<void> {
    serviceLogger.info({ operation: 'deleteProperty', id }, 'Deleting property');
    
    try {
      // Check if property exists
      const existingProperty = await this.propertyRepository.findById(id);
      if (!existingProperty) {
        throw new NotFoundError('Property', id);
      }
      
      // Delete associated images if any
      if (existingProperty.imageUrl) {
        try {
          await this.mediaService.deleteImage(existingProperty.imageUrl);
        } catch (error) {
          serviceLogger.warn({ error, imageUrl: existingProperty.imageUrl }, 'Failed to delete property image');
        }
      }
      
      await this.propertyRepository.delete(id);
      
      // Publish event for other services
      await this.eventBus.publish('property.deleted', { id, title: existingProperty.title });
      
      serviceLogger.info({ operation: 'deleteProperty', propertyId: id }, 'Property deleted successfully');
    } catch (error) {
      serviceLogger.error({ error, operation: 'deleteProperty', id }, 'Failed to delete property');
      throw error;
    }
  }

  async getPropertiesStats(): Promise<any> {
    serviceLogger.info({ operation: 'getPropertiesStats' }, 'Fetching properties statistics');
    
    try {
      const total = await this.propertyRepository.count();
      
      // Get counts by status
      const forSale = await this.propertyRepository.count({ status: 'for_sale' });
      const forRent = await this.propertyRepository.count({ status: 'for_rent' });
      const sold = await this.propertyRepository.count({ status: 'sold' });
      
      // Get pricing stats (simplified for MVP)
      const properties = await this.propertyRepository.findMany({ limit: 1000, sortBy: 'price', sortOrder: 'asc' });
      const prices = properties.map(p => p.price).filter(p => p !== null);
      
      const stats = {
        total,
        byStatus: { forSale, forRent, sold },
        pricing: {
          average: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
          median: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0,
        },
        lastUpdated: new Date().toISOString(),
      };
      
      serviceLogger.info({ operation: 'getPropertiesStats', stats }, 'Properties statistics fetched successfully');
      
      return stats;
    } catch (error) {
      serviceLogger.error({ error, operation: 'getPropertiesStats' }, 'Failed to get properties statistics');
      throw error;
    }
  }

  async searchProperties(query: string, limit: number = 20): Promise<any> {
    serviceLogger.info({ operation: 'searchProperties', query, limit }, 'Searching properties');
    
    try {
      const properties = await this.propertyRepository.findMany({
        q: query,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      const result = {
        data: properties,
        query,
        count: properties.length,
        timestamp: new Date().toISOString(),
      };
      
      serviceLogger.info({ 
        operation: 'searchProperties', 
        query, 
        count: properties.length 
      }, 'Properties search completed successfully');
      
      return result;
    } catch (error) {
      serviceLogger.error({ error, operation: 'searchProperties', query }, 'Failed to search properties');
      throw error;
    }
  }

  async getNearbyProperties(lat: number, lng: number, radius: number = 5, limit: number = 20): Promise<any> {
    serviceLogger.info({ 
      operation: 'getNearbyProperties', 
      coordinates: { lat, lng }, 
      radius, 
      limit 
    }, 'Finding nearby properties');
    
    try {
      const properties = await this.propertyRepository.findNearby({
        nearbySearch: { latitude: lat, longitude: lng, radiusKm: radius },
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      const result = {
        data: properties,
        location: { latitude: lat, longitude: lng },
        radiusKm: radius,
        count: properties.length,
        timestamp: new Date().toISOString(),
      };
      
      serviceLogger.info({ 
        operation: 'getNearbyProperties', 
        coordinates: { lat, lng }, 
        count: result.count 
      }, 'Nearby properties search completed successfully');
      
      return result;
    } catch (error) {
      serviceLogger.error({ 
        error, 
        operation: 'getNearbyProperties', 
        coordinates: { lat, lng } 
      }, 'Failed to find nearby properties');
      throw error;
    }
  }

  private async validateBusinessRules(data: PropertyCreateInput): Promise<void> {
    try {
      // Price validation
      if (data.price !== undefined) {
        validatePriceRange(data.price);
      }
      
      // Area validation
      if (data.area !== undefined) {
        validateAreaRange(data.area);
      }
      
      // Bedroom validation
      if (data.bedrooms !== undefined) {
        validateBedroomRange(data.bedrooms);
      }
      
      // Bathroom validation
      if (data.bathrooms !== undefined) {
        validateBathroomRange(data.bathrooms);
      }
      
      // Year built validation
      if (data.yearBuilt !== undefined) {
        validateYearRange(data.yearBuilt);
      }
      
      // Coordinates validation
      if (data.coordinates !== undefined && data.coordinates !== null) {
        validateCoordinates(data.coordinates.latitude, data.coordinates.longitude);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Business validation failed', [error instanceof Error ? error.message : 'Unknown error']);
    }
  }

  private validateFilters(filters: PropertyFilters): void {
    const errors: string[] = [];
    
    // Price range validation
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      if (filters.minPrice > filters.maxPrice) {
        errors.push('Minimum price cannot be greater than maximum price');
      }
    }
    
    // Area range validation
    if (filters.minArea !== undefined && filters.maxArea !== undefined) {
      if (filters.minArea > filters.maxArea) {
        errors.push('Minimum area cannot be greater than maximum area');
      }
    }
    
    // Year range validation
    if (filters.minYearBuilt !== undefined && filters.maxYearBuilt !== undefined) {
      if (filters.minYearBuilt > filters.maxYearBuilt) {
        errors.push('Minimum year built cannot be greater than maximum year built');
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Filter validation failed', errors);
    }
  }
}
