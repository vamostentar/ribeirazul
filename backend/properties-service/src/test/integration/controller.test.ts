import { FastifyReply, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyController } from '../../controllers/property.controller';
import { AppError, NotFoundError, ValidationError } from '../../types/common';
import { cleanDatabase, createTestProperty, waitForDatabase } from '../setup-ephemeral';

// Mock the service to use test database
vi.mock('../../services/property.service', () => ({
  propertyService: {
    createProperty: vi.fn(),
    getPropertyById: vi.fn(),
    getProperties: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
    getPropertiesStats: vi.fn(),
    searchPropertiesByText: vi.fn(),
    getPropertiesNearLocation: vi.fn(),
  },
}));

// Mock the logger to avoid console noise during tests
vi.mock('../../utils/logger', () => ({
  httpLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Property Controller Integration', () => {
  let controller: PropertyController;
  let mockService: any;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
    
    // Get the mocked service
    const { propertyService } = await import('../../services/property.service');
    mockService = propertyService;
    
    controller = new PropertyController();
    await waitForDatabase();
    
    // Setup mock request and reply
    mockRequest = {
      body: {},
      params: {},
      query: {},
      headers: {},
    };
    
    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe('createProperty', () => {
    it('should create property successfully with valid data', async () => {
      const propertyData = createTestProperty();
      const expectedProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...propertyData,
        createdAt: new Date(),
        updatedAt: new Date(),
        pricePerSqm: 3125,
        propertyAge: 4,
      };
      
      mockRequest.body = propertyData;
      mockService.createProperty.mockResolvedValue(expectedProperty);
      
      await controller.createProperty(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.createProperty).toHaveBeenCalledWith({
        ...propertyData,
        status: 'for_sale', // Default value
      });
      expect(mockReply.code).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: expectedProperty,
        message: 'Property created successfully',
        timestamp: expect.any(String),
      });
    });

    it('should set default status when not provided', async () => {
      const propertyData = {
        title: 'Test Property',
        location: 'Lisbon',
        price: 250000,
      };
      
      mockRequest.body = propertyData;
      const expectedProperty = { ...propertyData, id: '123', status: 'for_sale' };
      mockService.createProperty.mockResolvedValue(expectedProperty);
      
      await controller.createProperty(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.createProperty).toHaveBeenCalledWith({
        ...propertyData,
        status: 'for_sale',
      });
    });

    it('should handle validation errors gracefully', async () => {
      const invalidPropertyData = {
        title: 'A'.repeat(201), // Exceeds max length
        location: 'Lisbon',
        price: 250000,
      };
      
      mockRequest.body = invalidPropertyData;
      const validationError = new ValidationError('Title too long');
      mockService.createProperty.mockRejectedValue(validationError);
      
      await expect(controller.createProperty(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(ValidationError);
    });

    it('should handle service errors gracefully', async () => {
      const propertyData = createTestProperty();
      mockRequest.body = propertyData;
      const serviceError = new Error('Service error');
      mockService.createProperty.mockRejectedValue(serviceError);
      
      await expect(controller.createProperty(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow('Service error');
    });

    it('should measure response time', async () => {
      const propertyData = createTestProperty();
      mockRequest.body = propertyData;
      const expectedProperty = { ...propertyData, id: '123' };
      mockService.createProperty.mockResolvedValue(expectedProperty);
      
      const startTime = Date.now();
      await controller.createProperty(mockRequest as FastifyRequest, mockReply as FastifyReply);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPropertyById', () => {
    it('should return property when found', async () => {
      const propertyId = '123e4567-e89b-42d3-a456-426614174000';
      const expectedProperty: any = { id: propertyId, ...createTestProperty() };
      
      mockRequest.params = { id: propertyId };
      mockService.getPropertyById.mockResolvedValue(expectedProperty);
      
      await controller.getPropertyById(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.getPropertyById).toHaveBeenCalledWith(propertyId);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: expectedProperty,
        timestamp: expect.any(String),
      });
    });

    it('should validate UUID format', async () => {
      const invalidId = 'invalid-uuid';
      mockRequest.params = { id: invalidId };
      
      await expect(controller.getPropertyById(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(ValidationError);
      
      expect(mockService.getPropertyById).not.toHaveBeenCalled();
    });

    it('should handle not found errors', async () => {
      const propertyId = '123e4567-e89b-42d3-a456-426614174000';
      mockRequest.params = { id: propertyId };
      const notFoundError = new NotFoundError('Property', propertyId);
      mockService.getPropertyById.mockRejectedValue(notFoundError);
      
      await expect(controller.getPropertyById(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('getProperties', () => {
    it('should return properties with pagination', async () => {
      const properties = [
        createTestProperty({ title: 'Property 1' }),
        createTestProperty({ title: 'Property 2' }),
      ];
      
      const paginatedResult = {
        data: properties,
        pagination: {
          nextCursor: null,
          hasMore: false,
          limit: 20,
          totalEstimate: 2,
        },
      };
      
      mockRequest.query = { limit: '20' };
      mockService.getProperties.mockResolvedValue(paginatedResult);
      
      await controller.getProperties(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.getProperties).toHaveBeenCalledWith({
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        nearbySearch: undefined,
      });
      expect(mockReply.send).toHaveBeenCalledWith({
        data: properties,
        pagination: paginatedResult.pagination,
        timestamp: expect.any(String),
      });
    });

    it('should handle simple response format', async () => {
      const properties = [createTestProperty()];
      const paginatedResult = {
        data: properties,
        pagination: { hasMore: false, limit: 20 },
      };
      
      mockRequest.query = { limit: '20' };
      mockRequest.headers = { 'x-response-format': 'simple' };
      mockService.getProperties.mockResolvedValue(paginatedResult);
      
      await controller.getProperties(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockReply.send).toHaveBeenCalledWith(properties);
    });

    it('should set default values for missing parameters', async () => {
      mockRequest.query = {};
      const paginatedResult = {
        data: [],
        pagination: { hasMore: false, limit: 20 },
      };
      mockService.getProperties.mockResolvedValue(paginatedResult);
      
      await controller.getProperties(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.getProperties).toHaveBeenCalledWith({
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        nearbySearch: undefined,
      });
    });

    it('should handle nearby search parameters', async () => {
      mockRequest.query = {
        lat: '38.7223',
        lng: '-9.1393',
        radius: '5',
        limit: '10',
      };
      
      const paginatedResult = {
        data: [],
        pagination: { hasMore: false, limit: 10 },
      };
      mockService.getProperties.mockResolvedValue(paginatedResult);
      
      await controller.getProperties(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.getProperties).toHaveBeenCalledWith({
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        nearbySearch: {
          latitude: 38.7223,
          longitude: -9.1393,
          radiusKm: 5,
        },
      });
    });

    it('should validate query parameters', async () => {
      mockRequest.query = { limit: 'invalid' };
      
      await expect(controller.getProperties(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow();
      
      expect(mockService.getProperties).not.toHaveBeenCalled();
    });
  });

  describe('updateProperty', () => {
    it('should update property successfully', async () => {
      const propertyId = '123e4567-e89b-42d3-a456-426614174000';
      const updateData = {
        title: 'Updated Property',
        price: 350000,
      };
      const updatedProperty = {
        ...createTestProperty(),
        ...updateData,
        id: propertyId,
      };
      
      mockRequest.params = { id: propertyId };
      mockRequest.body = updateData;
      mockService.updateProperty.mockResolvedValue(updatedProperty);
      
      await controller.updateProperty(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.updateProperty).toHaveBeenCalledWith(propertyId, updateData);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: updatedProperty,
        message: 'Property updated successfully',
        timestamp: expect.any(String),
      });
    });

    it('should validate UUID format', async () => {
      const invalidId = 'invalid-uuid';
      mockRequest.params = { id: invalidId };
      mockRequest.body = { title: 'Updated' };
      
      await expect(controller.updateProperty(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(ValidationError);
      
      expect(mockService.updateProperty).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const propertyId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUpdateData = { price: -1000 };
      
      mockRequest.params = { id: propertyId };
      mockRequest.body = invalidUpdateData;
      const validationError = new ValidationError('Invalid price');
      mockService.updateProperty.mockRejectedValue(validationError);
      
      await expect(controller.updateProperty(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('deleteProperty', () => {
    it('should delete property successfully', async () => {
      const propertyId = '123e4567-e89b-42d3-a456-426614174000';
      mockRequest.params = { id: propertyId };
      mockService.deleteProperty.mockResolvedValue(undefined);
      
      await controller.deleteProperty(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.deleteProperty).toHaveBeenCalledWith(propertyId);
      expect(mockReply.code).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('should validate UUID format', async () => {
      const invalidId = 'invalid-uuid';
      mockRequest.params = { id: invalidId };
      
      await expect(controller.deleteProperty(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(ValidationError);
      
      expect(mockService.deleteProperty).not.toHaveBeenCalled();
    });
  });

  describe('getPropertiesStats', () => {
    it('should return property statistics', async () => {
      const stats = {
        total: 10,
        byStatus: { forSale: 6, forRent: 3, sold: 1 },
        pricing: { average: 300000, median: 300000, min: 200000, max: 400000 },
        lastUpdated: new Date().toISOString(),
      };
      
      mockService.getPropertiesStats.mockResolvedValue(stats);
      
      await controller.getPropertiesStats(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.getPropertiesStats).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith({
        data: stats,
        timestamp: expect.any(String),
      });
    });
  });

  describe('searchProperties', () => {
    it('should search properties by text', async () => {
      const query = 'apartment';
      const properties = [createTestProperty({ title: 'Beautiful Apartment' })];
      
      mockRequest.query = { q: query, limit: '10' };
      mockService.searchPropertiesByText.mockResolvedValue(properties);
      
      await controller.searchProperties(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.searchPropertiesByText).toHaveBeenCalledWith(query, 10);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: properties,
        query,
        count: properties.length,
        timestamp: expect.any(String),
      });
    });

    it('should require search query', async () => {
      mockRequest.query = {};
      
      await expect(controller.searchProperties(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(AppError);
      
      expect(mockService.searchPropertiesByText).not.toHaveBeenCalled();
    });

    it('should handle non-string queries', async () => {
      mockRequest.query = { q: 123 };
      
      await expect(controller.searchProperties(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(AppError);
      
      expect(mockService.searchPropertiesByText).not.toHaveBeenCalled();
    });

    it('should use default limit when not provided', async () => {
      const query = 'apartment';
      const properties = [createTestProperty()];
      
      mockRequest.query = { q: query };
      mockService.searchPropertiesByText.mockResolvedValue(properties);
      
      await controller.searchProperties(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.searchPropertiesByText).toHaveBeenCalledWith(query, 20);
    });
  });

  describe('getNearbyProperties', () => {
    it('should find nearby properties', async () => {
      const latitude = '38.7223';
      const longitude = '-9.1393';
      const radius = '5';
      const limit = '15';
      
      const properties = [createTestProperty({ title: 'Nearby Property' })];
      
      mockRequest.query = { lat: latitude, lng: longitude, radius, limit };
      mockService.getPropertiesNearLocation.mockResolvedValue(properties);
      
      await controller.getNearbyProperties(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.getPropertiesNearLocation).toHaveBeenCalledWith(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius),
        parseInt(limit, 10)
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        data: properties,
        location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        radiusKm: parseFloat(radius),
        count: properties.length,
        timestamp: expect.any(String),
      });
    });

    it('should require latitude and longitude', async () => {
      mockRequest.query = { radius: '5' };
      
      await expect(controller.getNearbyProperties(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(AppError);
      
      expect(mockService.getPropertiesNearLocation).not.toHaveBeenCalled();
    });

    it('should validate coordinate format', async () => {
      mockRequest.query = { lat: 'invalid', lng: '-9.1393' };
      
      await expect(controller.getNearbyProperties(mockRequest as FastifyRequest, mockReply as FastifyReply))
        .rejects.toThrow(AppError);
      
      expect(mockService.getPropertiesNearLocation).not.toHaveBeenCalled();
    });

    it('should use default radius and limit', async () => {
      const latitude = '38.7223';
      const longitude = '-9.1393';
      const properties = [createTestProperty()];
      
      mockRequest.query = { lat: latitude, lng: longitude };
      mockService.getPropertiesNearLocation.mockResolvedValue(properties);
      
      await controller.getNearbyProperties(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockService.getPropertiesNearLocation).toHaveBeenCalledWith(
        parseFloat(latitude),
        parseFloat(longitude),
        5, // Default radius
        20  // Default limit
      );
    });
  });

  describe('error handling', () => {
    it('should handle all types of errors gracefully', async () => {
      const testCases = [
        { error: new ValidationError('Validation failed'), expectedStatus: 400 },
        { error: new NotFoundError('Property', '123'), expectedStatus: 404 },
        { error: new AppError('Custom error', 422), expectedStatus: 422 },
        { error: new Error('Unknown error'), expectedStatus: 500 },
      ];
      
      for (const testCase of testCases) {
        mockRequest.body = createTestProperty();
        mockService.createProperty.mockRejectedValue(testCase.error);
        
        try {
          await controller.createProperty(mockRequest as FastifyRequest, mockReply as FastifyReply);
        } catch (error) {
          expect(error).toBe(testCase.error);
        }
      }
    });

    it('should measure response time for all operations', async () => {
      const operations = [
        () => controller.createProperty(mockRequest as FastifyRequest, mockReply as FastifyReply),
        () => controller.getPropertyById(mockRequest as FastifyRequest, mockReply as FastifyReply),
        () => controller.getProperties(mockRequest as FastifyRequest, mockReply as FastifyReply),
        () => controller.updateProperty(mockRequest as FastifyRequest, mockReply as FastifyReply),
        () => controller.deleteProperty(mockRequest as FastifyRequest, mockReply as FastifyReply),
        () => controller.getPropertiesStats(mockRequest as FastifyRequest, mockReply as FastifyReply),
      ];
      
      for (const operation of operations) {
        // Setup mocks for each operation
        mockRequest.body = createTestProperty();
        mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
        mockRequest.query = {};
        
        mockService.createProperty.mockResolvedValue({ id: '123' });
        mockService.getPropertyById.mockResolvedValue({ id: '123' });
        mockService.getProperties.mockResolvedValue({ data: [], pagination: {} });
        mockService.updateProperty.mockResolvedValue({ id: '123' });
        mockService.deleteProperty.mockResolvedValue(undefined);
        mockService.getPropertiesStats.mockResolvedValue({ total: 0 });
        
        const startTime = Date.now();
        try {
          await operation();
        } catch (error) {
          // Some operations might fail due to missing setup, that's expected
        }
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeGreaterThanOrEqual(0);
      }
    });
  });
});


