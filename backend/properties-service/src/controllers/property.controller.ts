import { FastifyReply, FastifyRequest } from 'fastify';
import { ServiceFactory } from '../factories/service.factory';
import { AppError } from '../types/common';
import {
    propertyCreateSchema,
    propertyFiltersSchema,
    propertyUpdateSchema
} from '../types/property';
import { httpLogger } from '../utils/logger';
import { validateInput, validateUUID } from '../utils/validation';

export class PropertyController {
  private serviceFactory: ServiceFactory;

  constructor() {
    this.serviceFactory = ServiceFactory.getInstance();
  }

  async createProperty(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      httpLogger.info({ operation: 'createProperty' }, 'Creating new property');
      
      const validatedData = validateInput(propertyCreateSchema, request.body);
      const dataWithDefaults = {
        ...validatedData,
        status: validatedData.status || 'for_sale' as const,
        adminStatus: validatedData.adminStatus ?? 'ACTIVE' as const,
      };

      const propertyService = this.serviceFactory.createCompletePropertyService();
      const property = await propertyService.createProperty(dataWithDefaults);
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'createProperty', 
        propertyId: property.id,
        responseTime 
      }, 'Property created successfully');
      
      return reply.code(201).send({
        data: property,
        message: 'Property created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'createProperty', 
        responseTime 
      }, 'Failed to create property');
      throw error;
    }
  }

  async getPropertyById(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      const { id } = request.params as { id: string };
      validateUUID(id);
      
      httpLogger.debug({ operation: 'getPropertyById', id }, 'Fetching property by ID');
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      const property = await propertyService.getPropertyById(id);
      
      const responseTime = Date.now() - startTime;
      httpLogger.debug({ 
        operation: 'getPropertyById', 
        propertyId: property.id,
        responseTime 
      }, 'Property fetched successfully');
      
      return reply.send({
        data: property,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'getPropertyById', 
        responseTime 
      }, 'Failed to fetch property');
      throw error;
    }
  }

  async getProperties(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      httpLogger.info({ operation: 'getProperties' }, 'Fetching properties with filters');

      // Support lat/lng/radius query by mapping to nearbySearch before validation
      const rawQuery = request.query as any;
      const enrichedQuery = { ...rawQuery } as any;
      if (rawQuery?.lat !== undefined && rawQuery?.lng !== undefined) {
        const latitude = parseFloat(String(rawQuery.lat));
        const longitude = parseFloat(String(rawQuery.lng));
        const radiusKm = rawQuery.radius !== undefined ? parseFloat(String(rawQuery.radius)) : 5;
        if (!Number.isNaN(latitude) && !Number.isNaN(longitude) && !Number.isNaN(radiusKm)) {
          enrichedQuery.nearbySearch = { latitude, longitude, radiusKm };
        }
      }

      const validatedFilters = validateInput(propertyFiltersSchema, enrichedQuery);
      
      // Ensure required properties are set
      const filtersWithDefaults = {
        ...validatedFilters,
        limit: validatedFilters.limit || 20,
        sortBy: validatedFilters.sortBy || 'createdAt',
        sortOrder: validatedFilters.sortOrder || 'desc',
        nearbySearch: validatedFilters.nearbySearch ? {
          ...validatedFilters.nearbySearch,
          radiusKm: validatedFilters.nearbySearch.radiusKm || 5,
        } : undefined,
      };
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      const result = await propertyService.getProperties(filtersWithDefaults);
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'getProperties', 
        count: result.data.length,
        hasMore: result.pagination.hasMore,
        responseTime 
      }, 'Properties fetched successfully');
      
      return reply.send({
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'getProperties', 
        responseTime 
      }, 'Failed to fetch properties');
      throw error;
    }
  }

  async getPropertiesPaginated(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      httpLogger.info({ operation: 'getPropertiesPaginated' }, 'Fetching paginated properties');

      const validatedFilters = validateInput(propertyFiltersSchema, request.query);
      
      // Ensure required properties are set
      const filtersWithDefaults = {
        ...validatedFilters,
        limit: validatedFilters.limit || 20,
        sortBy: validatedFilters.sortBy || 'createdAt',
        sortOrder: validatedFilters.sortOrder || 'desc',
        nearbySearch: validatedFilters.nearbySearch ? {
          ...validatedFilters.nearbySearch,
          radiusKm: validatedFilters.nearbySearch.radiusKm || 5,
        } : undefined,
      };
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      const result = await propertyService.getProperties(filtersWithDefaults);
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'getPropertiesPaginated', 
        count: result.data.length,
        hasMore: result.pagination.hasMore,
        responseTime 
      }, 'Paginated properties fetched successfully');
      
      return reply.send({
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'getPropertiesPaginated', 
        responseTime 
      }, 'Failed to fetch paginated properties');
      throw error;
    }
  }

  async updateProperty(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      const { id } = request.params as { id: string };
      validateUUID(id);
      
      httpLogger.info({ operation: 'updateProperty', id }, 'Updating property');
      
      const validatedData = validateInput(propertyUpdateSchema, request.body);
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      const property = await propertyService.updateProperty(id, validatedData);
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'updateProperty', 
        propertyId: id,
        responseTime 
      }, 'Property updated successfully');
      
      return reply.send({
        data: property,
        message: 'Property updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'updateProperty', 
        responseTime 
      }, 'Failed to update property');
      throw error;
    }
  }

  async deleteProperty(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      const { id } = request.params as { id: string };
      validateUUID(id);
      
      httpLogger.info({ operation: 'deleteProperty', id }, 'Deleting property');
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      await propertyService.deleteProperty(id);
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'deleteProperty', 
        propertyId: id,
        responseTime 
      }, 'Property deleted successfully');
      
      return reply.code(204).send();
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'deleteProperty', 
        responseTime 
      }, 'Failed to delete property');
      throw error;
    }
  }

  async getPropertiesStats(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      httpLogger.info({ operation: 'getPropertiesStats' }, 'Fetching properties statistics');
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      const stats = await propertyService.getPropertiesStats();
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'getPropertiesStats', 
        responseTime 
      }, 'Properties statistics fetched successfully');
      
      return reply.send({
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'getPropertiesStats', 
        responseTime 
      }, 'Failed to fetch properties statistics');
      throw error;
    }
  }

  async searchProperties(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      const { q, limit = 20 } = request.query as { q: string; limit?: number };
      
      if (!q || q.length < 3) {
        throw new AppError('Search query must be at least 3 characters long', 400);
      }
      
      httpLogger.info({ operation: 'searchProperties', query: q, limit }, 'Searching properties');
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      const result = await propertyService.searchProperties(q, limit);
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'searchProperties', 
        query: q,
        count: result.count,
        responseTime 
      }, 'Properties search completed successfully');
      
      return reply.send(result);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'searchProperties', 
        responseTime 
      }, 'Failed to search properties');
      throw error;
    }
  }

  async getNearbyProperties(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      const { lat, lng, radius = '5', limit = '20' } = request.query as { 
        lat: string; 
        lng: string; 
        radius?: string; 
        limit?: string; 
      };
      
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius);
      const limitNum = parseInt(limit);
      
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new AppError('Invalid coordinates provided', 400);
      }
      
      httpLogger.info({ 
        operation: 'getNearbyProperties', 
        coordinates: { lat: latitude, lng: longitude }, 
        radius: radiusKm, 
        limit: limitNum 
      }, 'Finding nearby properties');
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      const result = await propertyService.getNearbyProperties(latitude, longitude, radiusKm, limitNum);
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'getNearbyProperties', 
        coordinates: { lat: latitude, lng: longitude },
        count: result.count,
        responseTime 
      }, 'Nearby properties search completed successfully');
      
      return reply.send(result);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'getNearbyProperties', 
        responseTime 
      }, 'Failed to find nearby properties');
      throw error;
    }
  }

  async updateAdminStatus(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      const { id } = request.params as { id: string };
      validateUUID(id);
      
      const { adminStatus } = request.body as { adminStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE' };

      httpLogger.info({ operation: 'updateAdminStatus', id, adminStatus }, 'Updating property admin status');
      console.log('📝 AdminStatus recebido:', adminStatus);
      
      const propertyService = this.serviceFactory.createCompletePropertyService();
      const property = await propertyService.updateProperty(id, { adminStatus });
      
      const responseTime = Date.now() - startTime;
      httpLogger.info({ 
        operation: 'updateAdminStatus', 
        propertyId: id,
        adminStatus,
        responseTime 
      }, 'Property admin status updated successfully');
      
      console.log('📤 Propriedade retornada:', { id: property.id, adminStatus: property.adminStatus });

      return reply.send({
        success: true,
        data: {
          id: property.id,
          adminStatus: property.adminStatus
        },
        message: 'Property admin status updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      httpLogger.error({ 
        error, 
        operation: 'updateAdminStatus', 
        responseTime 
      }, 'Failed to update property admin status');
      throw error;
    }
  }
}

// Export singleton instance
export const propertyController = new PropertyController();
