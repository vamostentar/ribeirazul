import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyServiceImpl } from '../../services/property.service';
import { NotFoundError, ValidationError } from '../../types/common';
import { PropertyFilters } from '../../types/property';
import { cleanDatabase, createTestProperty, waitForDatabase } from '../setup-ephemeral';

// Mock the repository to use test database
vi.mock('../../repositories/property.repository', () => ({
  propertyRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

// Mock the logger to avoid console noise during tests
vi.mock('../../utils/logger', () => ({
  serviceLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Property Service', () => {
  let service: PropertyServiceImpl;
  let mockRepository: any;
  
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
    
    // Get the mocked repository
    const { propertyRepository } = await import('../../repositories/property.repository');
    mockRepository = propertyRepository;
    
    service = new PropertyServiceImpl();
    await waitForDatabase();
  });

  describe('createProperty', () => {
    it('should create property successfully with valid data', async () => {
      const propertyData = createTestProperty();
      const expectedProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...propertyData,
        createdAt: new Date(),
        updatedAt: new Date(),
        pricePerSqm: 3125, // 250000 / 80
        propertyAge: 4, // 2024 - 2020
      };
      
      mockRepository.create.mockResolvedValue(expectedProperty);
      
      const result = await service.createProperty(propertyData);
      
      expect(mockRepository.create).toHaveBeenCalledWith(propertyData);
      expect(result).toEqual(expectedProperty);
    });

    it('should validate business rules before creating', async () => {
      const invalidPropertyData = createTestProperty({
        price: 200000000, // Exceeds MAX_PRICE
      });
      
      await expect(service.createProperty(invalidPropertyData))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should validate coordinates if provided', async () => {
      const invalidPropertyData = createTestProperty({
        coordinates: {
          latitude: 100, // Invalid latitude
          longitude: -9.1393,
        },
      });
      
      await expect(service.createProperty(invalidPropertyData))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should validate year built if provided', async () => {
      const futureYear = new Date().getFullYear() + 1;
      const invalidPropertyData = createTestProperty({
        yearBuilt: futureYear,
      });
      
      await expect(service.createProperty(invalidPropertyData))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should validate area if provided', async () => {
      const invalidPropertyData = createTestProperty({
        area: 60000, // Exceeds max 50,000 m²
      });
      
      await expect(service.createProperty(invalidPropertyData))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should validate features count if provided', async () => {
      const invalidPropertyData = createTestProperty({
        features: Array(21).fill('FEATURE'), // Exceeds max 20
      });
      
      await expect(service.createProperty(invalidPropertyData))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      const propertyData = createTestProperty();
      const error = new Error('Database connection failed');
      
      mockRepository.create.mockRejectedValue(error);
      
      await expect(service.createProperty(propertyData))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getPropertyById', () => {
    it('should return property when found', async () => {
      const expectedProperty = {
        ...createTestProperty(),
        id: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      mockRepository.findById.mockResolvedValue(expectedProperty);
      
      const result = await service.getPropertyById('123e4567-e89b-12d3-a456-426614174000');
      
      expect(mockRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(result).toEqual(expectedProperty);
    });

    it('should throw NotFoundError when property not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      
      await expect(service.getPropertyById('123e4567-e89b-12d3-a456-426614174000'))
        .rejects.toThrow(NotFoundError);
    });

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database error');
      mockRepository.findById.mockRejectedValue(error);
      
      await expect(service.getPropertyById('123e4567-e89b-12d3-a456-426614174000'))
        .rejects.toThrow('Database error');
    });
  });

  describe('getProperties', () => {
    it('should return properties with pagination', async () => {
      const properties = [
        createTestProperty({ title: 'Property 1' }),
        createTestProperty({ title: 'Property 2' }),
      ];
      
      mockRepository.findMany.mockResolvedValue(properties);
      mockRepository.count.mockResolvedValue(2);
      
      const filters: PropertyFilters = {
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await service.getProperties(filters);
      
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        ...filters,
        limit: 21, // limit + 1 for pagination
      });
      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.totalEstimate).toBe(2);
    });

    it('should handle pagination with more results', async () => {
      const properties = [
        createTestProperty({ title: 'Property 1' }),
        createTestProperty({ title: 'Property 2' }),
        createTestProperty({ title: 'Property 3' }), // Extra property for pagination logic
      ];
      
      mockRepository.findMany.mockResolvedValue(properties);
      mockRepository.count.mockResolvedValue(5); // More properties exist (5 total)
      
      const filters: PropertyFilters = {
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await service.getProperties(filters);
      
      expect(result.data).toHaveLength(2); // Service removes the extra property
      expect(result.pagination.hasMore).toBe(true); // 3 returned > 2 limit
      expect(result.pagination.nextCursor).toBeDefined();
    });

    it('should validate filters before querying', async () => {
      const invalidFilters: PropertyFilters = {
        minPrice: 500000,
        maxPrice: 300000, // Invalid range
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      await expect(service.getProperties(invalidFilters))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.findMany).not.toHaveBeenCalled();
    });

    it('should validate nearby search parameters', async () => {
      const invalidFilters: PropertyFilters = {
        nearbySearch: {
          latitude: 100, // Invalid latitude
          longitude: -9.1393,
          radiusKm: 5,
        },
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      await expect(service.getProperties(invalidFilters))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.findMany).not.toHaveBeenCalled();
    });

    it('should handle count failures gracefully', async () => {
      const properties = [createTestProperty()];
      
      mockRepository.findMany.mockResolvedValue(properties);
      mockRepository.count.mockRejectedValue(new Error('Count failed'));
      
      const filters: PropertyFilters = {
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await service.getProperties(filters);
      
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalEstimate).toBeUndefined();
    });
  });

  describe('updateProperty', () => {
    it('should update property successfully with valid data', async () => {
      const existingProperty = {
        ...createTestProperty(),
        id: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const updateData = {
        title: 'Updated Property',
        price: 350000,
      };
      
      const updatedProperty = {
        ...existingProperty,
        ...updateData,
        updatedAt: new Date(),
      };
      
      mockRepository.update.mockResolvedValue(updatedProperty);
      
      const result = await service.updateProperty('123e4567-e89b-12d3-a456-426614174000', updateData);
      
      expect(mockRepository.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', updateData);
      expect(result).toEqual(updatedProperty);
    });

    it('should validate business rules before updating', async () => {
      const updateData = {
        price: 200000000, // Exceeds MAX_PRICE
      };
      
      await expect(service.updateProperty('123e4567-e89b-12d3-a456-426614174000', updateData))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      const updateData = { title: 'Updated Property' };
      const error = new Error('Update failed');
      
      mockRepository.update.mockRejectedValue(error);
      
      await expect(service.updateProperty('123e4567-e89b-12d3-a456-426614174000', updateData))
        .rejects.toThrow('Update failed');
    });
  });

  describe('deleteProperty', () => {
    it('should delete property successfully', async () => {
      mockRepository.delete.mockResolvedValue(undefined);
      
      await service.deleteProperty('123e4567-e89b-12d3-a456-426614174000');
      
      expect(mockRepository.delete).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Delete failed');
      mockRepository.delete.mockRejectedValue(error);
      
      await expect(service.deleteProperty('123e4567-e89b-12d3-a456-426614174000'))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('getPropertiesStats', () => {
    it('should return comprehensive statistics', async () => {
      mockRepository.count
        .mockResolvedValueOnce(10) // Total
        .mockResolvedValueOnce(6)  // For sale
        .mockResolvedValueOnce(3)  // For rent
        .mockResolvedValueOnce(1); // Sold
      
      const properties = [
        createTestProperty({ price: 200000 }),
        createTestProperty({ price: 300000 }),
        createTestProperty({ price: 400000 }),
      ];
      
      mockRepository.findMany.mockResolvedValue(properties);
      
      const result = await service.getPropertiesStats();
      
      expect(result.total).toBe(10);
      expect(result.byStatus.forSale).toBe(6);
      expect(result.byStatus.forRent).toBe(3);
      expect(result.byStatus.sold).toBe(1);
      expect(result.pricing.average).toBe(300000);
      expect(result.pricing.median).toBe(300000);
      expect(result.pricing.min).toBe(200000);
      expect(result.pricing.max).toBe(400000);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should handle empty properties gracefully', async () => {
      mockRepository.count
        .mockResolvedValueOnce(0) // Total
        .mockResolvedValueOnce(0) // For sale
        .mockResolvedValueOnce(0) // For rent
        .mockResolvedValueOnce(0); // Sold
      
      mockRepository.findMany.mockResolvedValue([]);
      
      const result = await service.getPropertiesStats();
      
      expect(result.total).toBe(0);
      expect(result.pricing.average).toBe(0);
      expect(result.pricing.median).toBe(0);
      expect(result.pricing.min).toBe(0);
      expect(result.pricing.max).toBe(0);
    });

    it('should handle count failures gracefully', async () => {
      // Configure all count mocks to fail
      mockRepository.count.mockRejectedValue(new Error('Count failed'));
      mockRepository.findMany.mockResolvedValue([]);
      
      await expect(service.getPropertiesStats()).rejects.toThrow('Count failed');
      
      expect(mockRepository.count).toHaveBeenCalledTimes(4); // 4 count calls in Promise.all
    });
  });

  describe('searchPropertiesByText', () => {
    it('should search properties by text successfully', async () => {
      const properties = [
        createTestProperty({ title: 'Apartment in Lisbon' }),
        createTestProperty({ title: 'House in Lisbon' }),
      ];
      
      mockRepository.findMany.mockResolvedValue(properties);
      
      const result = await service.searchPropertiesByText('Lisbon');
      
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        q: 'Lisbon',
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(result).toEqual(properties);
    });

    it('should reject short search queries', async () => {
      await expect(service.searchPropertiesByText('ab'))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.findMany).not.toHaveBeenCalled();
    });

    it('should reject empty search queries', async () => {
      await expect(service.searchPropertiesByText(''))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.findMany).not.toHaveBeenCalled();
    });

    it('should handle custom limit', async () => {
      const properties = [createTestProperty()];
      mockRepository.findMany.mockResolvedValue(properties);
      
      await service.searchPropertiesByText('Lisbon', 5);
      
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        q: 'Lisbon',
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });
  });

  describe('getPropertiesNearLocation', () => {
    it('should find nearby properties successfully', async () => {
      const properties = [
        createTestProperty({ title: 'Nearby Property' }),
      ];
      
      mockRepository.findMany.mockResolvedValue(properties);
      
      const result = await service.getPropertiesNearLocation(38.7223, -9.1393, 5, 20);
      
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        nearbySearch: {
          latitude: 38.7223,
          longitude: -9.1393,
          radiusKm: 5,
        },
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(result).toEqual(properties);
    });

    it('should validate coordinates', async () => {
      await expect(service.getPropertiesNearLocation(100, -9.1393, 5, 20))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.findMany).not.toHaveBeenCalled();
    });

    it('should validate radius', async () => {
      await expect(service.getPropertiesNearLocation(38.7223, -9.1393, 0, 20))
        .rejects.toThrow(ValidationError);
      
      await expect(service.getPropertiesNearLocation(38.7223, -9.1393, 101, 20))
        .rejects.toThrow(ValidationError);
      
      expect(mockRepository.findMany).not.toHaveBeenCalled();
    });

    it('should use default radius and limit', async () => {
      const properties = [createTestProperty()];
      mockRepository.findMany.mockResolvedValue(properties);
      
      await service.getPropertiesNearLocation(38.7223, -9.1393);
      
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        nearbySearch: {
          latitude: 38.7223,
          longitude: -9.1393,
          radiusKm: 5, // Default
        },
        limit: 20, // Default
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });
  });

  describe('business rule validation', () => {
    it('should validate maximum price limit', async () => {
      const overpricedProperty = createTestProperty({
        price: 200000000, // €200M, exceeds limit
      });
      
      await expect(service.createProperty(overpricedProperty))
        .rejects.toThrow(ValidationError);
    });

    it('should validate coordinate ranges', async () => {
      const invalidLatitude = createTestProperty({
        coordinates: { latitude: 91, longitude: 0 },
      });
      
      await expect(service.createProperty(invalidLatitude))
        .rejects.toThrow(ValidationError);
      
      const invalidLongitude = createTestProperty({
        coordinates: { latitude: 0, longitude: 181 },
      });
      
      await expect(service.createProperty(invalidLongitude))
        .rejects.toThrow(ValidationError);
    });

    it('should validate year built range', async () => {
      const futureYear = createTestProperty({
        yearBuilt: new Date().getFullYear() + 1,
      });
      
      await expect(service.createProperty(futureYear))
        .rejects.toThrow(ValidationError);
      
      const ancientYear = createTestProperty({
        yearBuilt: 1799, // Before 1800
      });
      
      await expect(service.createProperty(ancientYear))
        .rejects.toThrow(ValidationError);
    });

    it('should validate area limits', async () => {
      const oversizedProperty = createTestProperty({
        area: 60000, // Exceeds 50,000 m²
      });
      
      await expect(service.createProperty(oversizedProperty))
        .rejects.toThrow(ValidationError);
    });

    it('should validate bedroom and bathroom counts', async () => {
      const invalidBedrooms = createTestProperty({
        bedrooms: 21, // Exceeds max 20
      });
      
      await expect(service.createProperty(invalidBedrooms))
        .rejects.toThrow(ValidationError);
      
      const invalidBathrooms = createTestProperty({
        bathrooms: -1, // Negative not allowed
      });
      
      await expect(service.createProperty(invalidBathrooms))
        .rejects.toThrow(ValidationError);
    });

    it('should validate features count', async () => {
      const tooManyFeatures = createTestProperty({
        features: Array(21).fill('FEATURE'), // Exceeds max 20
      });
      
      await expect(service.createProperty(tooManyFeatures))
        .rejects.toThrow(ValidationError);
    });
  });
});
