import { config } from '../config/index';
import { propertyRepository } from '../repositories/property.repository';
import { NotFoundError, PaginatedResponse, ValidationError } from '../types/common';
import { PropertyCreateInput, PropertyFilters, PropertyResponse, PropertyService, PropertyUpdateInput } from '../types/property';
import { serviceLogger } from '../utils/logger';
import {
  validateAreaRange,
  validateBathroomRange,
  validateBedroomRange,
  validateCoordinates,
  validatePriceRange,
  validateYearRange
} from '../utils/validation';

export class PropertyServiceImpl implements PropertyService {
  async createProperty(data: PropertyCreateInput): Promise<PropertyResponse> {
    serviceLogger.info({ operation: 'createProperty', data: { title: data.title } }, 'Creating property');
    
    try {
      // Additional business validations
      await this.validateBusinessRules(data);
      
      const property = await propertyRepository.create(data);
      
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
      const property = await propertyRepository.findById(id);
      
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
      
      const properties = await propertyRepository.findMany(filtersWithExtraLimit);
      
      // Determine if there are more results
      let nextCursor: string | null = null;
      let hasMore = false;
      
      if (properties.length > filters.limit) {
        const lastProperty = properties.pop(); // Remove the extra item
        nextCursor = lastProperty?.id || null;
        hasMore = true;
      }
      
      // Get total count estimate for better UX (optional, can be expensive for large datasets)
      let totalEstimate: number | undefined;
      if (filters.cursor === undefined && properties.length > 0) {
        // Only estimate total on first page
        try {
          totalEstimate = await propertyRepository.count(filters);
        } catch {
          // If count fails, don't break the request
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
        totalEstimate
      }, 'Properties fetched successfully');
      
      return result;
    } catch (error) {
      serviceLogger.error({ error, operation: 'getProperties', filters }, 'Failed to get properties');
      throw error;
    }
  }

  async updateProperty(id: string, data: PropertyUpdateInput): Promise<PropertyResponse> {
    serviceLogger.info({ operation: 'updateProperty', id, data }, 'Updating property');
    
    try {
      // Additional business validations for updates
      await this.validateBusinessRules(data);
      
      console.log('🔍 Serviço: Chamando repositório com dados:', { id, data });
      const property = await propertyRepository.update(id, data);
      console.log('🔍 Serviço: Repositório retornou:', { id: property.id, adminStatus: property.adminStatus });
      
      serviceLogger.info({ 
        operation: 'updateProperty', 
        propertyId: property.id,
        updated: true 
      }, 'Property updated successfully');
      
      return property;
    } catch (error) {
      serviceLogger.error({ error, operation: 'updateProperty', id }, 'Failed to update property');
      throw error;
    }
  }

  async deleteProperty(id: string): Promise<void> {
    serviceLogger.info({ operation: 'deleteProperty', id }, 'Deleting property');
    
    try {
      await propertyRepository.delete(id);
      
      serviceLogger.info({ 
        operation: 'deleteProperty', 
        propertyId: id,
        deleted: true 
      }, 'Property deleted successfully');
    } catch (error) {
      serviceLogger.error({ error, operation: 'deleteProperty', id }, 'Failed to delete property');
      throw error;
    }
  }

  async getPropertiesStats(): Promise<any> {
    serviceLogger.info({ operation: 'getPropertiesStats' }, 'Fetching properties statistics');
    
    try {
      const [
        totalCount,
        forSaleCount,
        forRentCount,
        soldCount,
      ] = await Promise.all([
        propertyRepository.count(),
        propertyRepository.count({ status: 'for_sale' }),
        propertyRepository.count({ status: 'for_rent' }),
        propertyRepository.count({ status: 'sold' }),
      ]);
      
      // Get price statistics (simplified - in production you might want more sophisticated queries)
      const allProperties = await propertyRepository.findMany({ 
        limit: 1000, 
        sortBy: 'createdAt', 
        sortOrder: 'desc' 
      } as PropertyFilters);
      
      const prices = allProperties.map(p => p.price);
      const avgPrice = prices.length > 0 
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length
        : 0;
      
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const medianPrice = sortedPrices.length > 0
        ? sortedPrices.length % 2 === 0
          ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
          : sortedPrices[Math.floor(sortedPrices.length / 2)]
        : 0;
      
      const stats = {
        total: totalCount,
        byStatus: {
          forSale: forSaleCount,
          forRent: forRentCount,
          sold: soldCount,
        },
        pricing: {
          average: Math.round(avgPrice),
          median: Math.round(medianPrice),
          min: sortedPrices[0] || 0,
          max: sortedPrices[sortedPrices.length - 1] || 0,
        },
        lastUpdated: new Date().toISOString(),
      };
      
      serviceLogger.info({ operation: 'getPropertiesStats', stats }, 'Properties statistics fetched');
      
      return stats;
    } catch (error) {
      serviceLogger.error({ error, operation: 'getPropertiesStats' }, 'Failed to get properties statistics');
      throw error;
    }
  }

  // Additional utility methods
  async searchPropertiesByText(query: string, limit: number = 20): Promise<PropertyResponse[]> {
    serviceLogger.info({ operation: 'searchPropertiesByText', query }, 'Searching properties by text');
    
    try {
      if (!query || query.trim().length < 3) {
        throw new ValidationError('Search query must be at least 3 characters long');
      }
      
      const filters: PropertyFilters = {
        q: query.trim(),
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const properties = await propertyRepository.findMany(filters);
      
      serviceLogger.info({ 
        operation: 'searchPropertiesByText', 
        query, 
        count: properties.length 
      }, 'Text search completed');
      
      return properties;
    } catch (error) {
      serviceLogger.error({ error, operation: 'searchPropertiesByText', query }, 'Failed to search properties');
      throw error;
    }
  }

  async getPropertiesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 20
  ): Promise<PropertyResponse[]> {
    serviceLogger.info({ 
      operation: 'getPropertiesNearLocation', 
      latitude, 
      longitude, 
      radiusKm 
    }, 'Finding properties near location');
    
    try {
      validateCoordinates(latitude, longitude);
      
      if (radiusKm <= 0 || radiusKm > 100) {
        throw new ValidationError('Radius must be between 0 and 100 kilometers');
      }
      
      const filters: PropertyFilters = {
        nearbySearch: {
          latitude,
          longitude,
          radiusKm,
        },
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const properties = await propertyRepository.findMany(filters);
      
      serviceLogger.info({ 
        operation: 'getPropertiesNearLocation', 
        latitude, 
        longitude, 
        radiusKm,
        count: properties.length 
      }, 'Nearby search completed');
      
      return properties;
    } catch (error) {
      serviceLogger.error({ 
        error, 
        operation: 'getPropertiesNearLocation', 
        latitude, 
        longitude 
      }, 'Failed to find nearby properties');
      throw error;
    }
  }

  private async validateBusinessRules(data: Partial<PropertyCreateInput>): Promise<void> {
    // Price validation
    if (data.price !== undefined && data.price > config.MAX_PRICE) {
      throw new ValidationError(`Price cannot exceed €${config.MAX_PRICE.toLocaleString()}`);
    }
    
    // Coordinates validation
    if (data.coordinates) {
      validateCoordinates(data.coordinates.latitude, data.coordinates.longitude);
    }
    
    // Year built validation
    if (data.yearBuilt !== undefined) {
      const currentYear = new Date().getFullYear();
      if (data.yearBuilt > currentYear) {
        throw new ValidationError('Year built cannot be in the future');
      }
      if (data.yearBuilt < 1800) {
        throw new ValidationError('Year built cannot be before 1800');
      }
    }
    
    // Area validation
    if (data.area !== undefined && data.area > 50000) {
      throw new ValidationError('Area cannot exceed 50,000 m²');
    }
    
    // Bedrooms/bathrooms validation
    if (data.bedrooms !== undefined && (data.bedrooms < 0 || data.bedrooms > 20)) {
      throw new ValidationError('Bedrooms must be between 0 and 20');
    }
    
    if (data.bathrooms !== undefined && (data.bathrooms < 0 || data.bathrooms > 20)) {
      throw new ValidationError('Bathrooms must be between 0 and 20');
    }
    
    // Features validation
    if (data.features && data.features.length > 20) {
      throw new ValidationError('Cannot have more than 20 features');
    }
  }
  
  private validateFilters(filters: PropertyFilters): void {
    // Validate price range
    validatePriceRange(filters.minPrice, filters.maxPrice);
    
    // Validate area range
    validateAreaRange(filters.minArea, filters.maxArea);
    
    // Validate bedroom range
    validateBedroomRange(filters.minBedrooms, filters.maxBedrooms);
    
    // Validate bathroom range
    validateBathroomRange(filters.minBathrooms, filters.maxBathrooms);
    
    // Validate year range
    validateYearRange(filters.minYearBuilt, filters.maxYearBuilt);
    
    // Validate nearby search
    if (filters.nearbySearch) {
      validateCoordinates(
        filters.nearbySearch.latitude, 
        filters.nearbySearch.longitude
      );
      
      if (filters.nearbySearch.radiusKm <= 0 || filters.nearbySearch.radiusKm > 100) {
        throw new ValidationError('Search radius must be between 0 and 100 kilometers');
      }
    }
  }
}

export const propertyService = new PropertyServiceImpl();
