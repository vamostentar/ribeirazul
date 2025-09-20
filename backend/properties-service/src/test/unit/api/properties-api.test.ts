/**
 * PropertiesAPI Unit Tests
 * 
 * Testing HTTP API layer in isolation
 * Verifies proper error handling and response formatting
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertiesAPIImpl, getHttpStatusCode } from '../../../api/properties-api';
import { PropertyNotFoundError, PropertyValidationError } from '../../../core/property-core';
import { PropertyCreateData, PropertyFilterData, PropertyUpdateData } from '../../../domain/property-types';

// Mock PropertyCore for testing API layer
class MockPropertyCore {
  createProperty = vi.fn();
  getProperty = vi.fn();
  searchProperties = vi.fn();
  updateProperty = vi.fn();
  deleteProperty = vi.fn();
  getStats = vi.fn();
  searchByText = vi.fn();
  findNearbyProperties = vi.fn();
  countProperties = vi.fn();
  isHealthy = vi.fn();

  // Reset all mocks
  resetMocks() {
    vi.clearAllMocks();
  }
}

describe('PropertiesAPI', () => {
  let mockCore: MockPropertyCore;
  let api: PropertiesAPIImpl;

  const mockPropertyData = {
    id: 'test-id-123',
    title: 'Test Property',
    location: 'Test Location',
    price: 250000,
    status: 'for_sale' as const,
    type: 'apartamento' as const,
    imageUrl: null,
    description: null,
    bedrooms: null,
    bathrooms: null,
    area: null,
    yearBuilt: null,
    coordinates: null,
    features: null,
    contactPhone: null,
    contactEmail: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    pricePerSqm: null,
    propertyAge: null,
  };

  beforeEach(() => {
    mockCore = new MockPropertyCore();
    api = new PropertiesAPIImpl(mockCore as any);
  });

  describe('createProperty', () => {
    it('should return success response when property is created', async () => {
      const createData: PropertyCreateData = {
        title: 'Test Property',
        location: 'Test Location',
        price: 250000,
        status: 'for_sale',
      };

      mockCore.createProperty.mockResolvedValue(mockPropertyData);

      const response = await api.createProperty(createData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPropertyData);
      expect(response.timestamp).toBeDefined();
      expect(mockCore.createProperty).toHaveBeenCalledWith(createData);
    });

    it('should return error response when validation fails', async () => {
      const createData: PropertyCreateData = {
        title: '',
        location: 'Test Location',
        price: 250000,
        status: 'for_sale',
      };

      const validationError = new PropertyValidationError('Title is required', 'title');
      mockCore.createProperty.mockRejectedValue(validationError);

      const response = await api.createProperty(createData);

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Title is required');
      expect(response.error?.code).toBe('VALIDATION_ERROR');
      expect(response.error?.field).toBe('title');
    });

    it('should return internal error response for unknown errors', async () => {
      const createData: PropertyCreateData = {
        title: 'Test Property',
        location: 'Test Location',
        price: 250000,
        status: 'for_sale',
      };

      mockCore.createProperty.mockRejectedValue(new Error('Database connection failed'));

      const response = await api.createProperty(createData);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INTERNAL_ERROR');
      expect(response.error?.message).toBeDefined();
    });
  });

  describe('getProperty', () => {
    it('should return success response when property exists', async () => {
      mockCore.getProperty.mockResolvedValue(mockPropertyData);

      const response = await api.getProperty('test-id-123');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPropertyData);
      expect(mockCore.getProperty).toHaveBeenCalledWith('test-id-123');
    });

    it('should return error response when property not found', async () => {
      const notFoundError = new PropertyNotFoundError('test-id-123');
      mockCore.getProperty.mockRejectedValue(notFoundError);

      const response = await api.getProperty('test-id-123');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('NOT_FOUND');
      expect(response.error?.message).toContain('not found');
    });
  });

  describe('searchProperties', () => {
    it('should return paginated results', async () => {
      const mockPaginatedResult = {
        properties: [mockPropertyData],
        pagination: {
          nextCursor: null,
          hasMore: false,
          limit: 20,
          totalEstimate: 1,
        }
      };

      mockCore.searchProperties.mockResolvedValue(mockPaginatedResult);

      const filters: PropertyFilterData = { limit: 20 };
      const response = await api.searchProperties(filters);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPaginatedResult);
      expect(mockCore.searchProperties).toHaveBeenCalledWith(filters);
    });
  });

  describe('updateProperty', () => {
    it('should return success response when property is updated', async () => {
      const updateData: PropertyUpdateData = { title: 'Updated Title' };
      const updatedProperty = { ...mockPropertyData, title: 'Updated Title' };

      mockCore.updateProperty.mockResolvedValue(updatedProperty);

      const response = await api.updateProperty('test-id-123', updateData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(updatedProperty);
      expect(mockCore.updateProperty).toHaveBeenCalledWith('test-id-123', updateData);
    });
  });

  describe('deleteProperty', () => {
    it('should return success response when property is deleted', async () => {
      mockCore.deleteProperty.mockResolvedValue(undefined);

      const response = await api.deleteProperty('test-id-123');

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
      expect(mockCore.deleteProperty).toHaveBeenCalledWith('test-id-123');
    });
  });

  describe('getStats', () => {
    it('should return property statistics', async () => {
      const mockStats = {
        total: 10,
        byStatus: { forSale: 5, forRent: 3, sold: 2 },
        pricing: { average: 300000, median: 280000, min: 150000, max: 500000 },
        lastUpdated: new Date().toISOString(),
      };

      mockCore.getStats.mockResolvedValue(mockStats);

      const response = await api.getStats();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockStats);
    });
  });

  describe('searchByText', () => {
    it('should return text search results', async () => {
      mockCore.searchByText.mockResolvedValue([mockPropertyData]);

      const response = await api.searchByText('villa', 10);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([mockPropertyData]);
      expect(mockCore.searchByText).toHaveBeenCalledWith('villa', 10);
    });
  });

  describe('findNearby', () => {
    it('should return nearby properties', async () => {
      mockCore.findNearbyProperties.mockResolvedValue([mockPropertyData]);

      const response = await api.findNearby(38.7223, -9.1393, 5, 10);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([mockPropertyData]);
      expect(mockCore.findNearbyProperties).toHaveBeenCalledWith(38.7223, -9.1393, 5, 10);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      mockCore.isHealthy.mockResolvedValue(true);

      const response = await api.healthCheck();

      expect(response.success).toBe(true);
      expect(response.data?.status).toBe('healthy');
    });

    it('should return unhealthy status', async () => {
      mockCore.isHealthy.mockResolvedValue(false);

      const response = await api.healthCheck();

      expect(response.success).toBe(true);
      expect(response.data?.status).toBe('unhealthy');
    });
  });

  describe('error handling', () => {
    it('should not expose internal error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockCore.getProperty.mockRejectedValue(new Error('Database connection string exposed'));

      const response = await api.getProperty('test-id');

      expect(response.error?.message).toBe('Internal server error');
      expect(response.error?.message).not.toContain('Database connection string');

      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error details in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const errorMessage = 'Detailed error message';
      mockCore.getProperty.mockRejectedValue(new Error(errorMessage));

      const response = await api.getProperty('test-id');

      expect(response.error?.message).toBe(errorMessage);

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('getHttpStatusCode', () => {
  it('should return 400 for validation errors', () => {
    const error = new PropertyValidationError('Invalid input');
    expect(getHttpStatusCode(error)).toBe(400);
  });

  it('should return 404 for not found errors', () => {
    const error = new PropertyNotFoundError('test-id');
    expect(getHttpStatusCode(error)).toBe(404);
  });

  it('should return 500 for unknown errors', () => {
    const error = new Error('Unknown error');
    expect(getHttpStatusCode(error)).toBe(500);
  });

  it('should return 500 for non-Error objects', () => {
    const error = { message: 'Something went wrong' };
    expect(getHttpStatusCode(error)).toBe(500);
  });
});