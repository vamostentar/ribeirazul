/**
 * PropertyCore Unit Tests
 * 
 * Testing pure business logic in isolation
 * Following Eskil Steenberg's principle: "Business logic should be testable without external dependencies"
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_BUSINESS_CONFIG, PropertyCore, PropertyNotFoundError, PropertyValidationError } from '../../../core/property-core';
import {
    PaginatedPropertyData,
    PropertyCreateData,
    PropertyData,
    PropertyFilterData,
    PropertyStats,
    PropertyUpdateData
} from '../../../domain/property-types';
import { PropertyDataGateway } from '../../../gateways/property-data-gateway';

// Mock gateway implementation for testing
class MockPropertyDataGateway implements PropertyDataGateway {
  private properties: Map<string, PropertyData> = new Map();
  private idCounter = 1;

  async create(data: PropertyCreateData): Promise<PropertyData> {
    const id = `mock-id-${this.idCounter++}`;
    const now = new Date();
    
    const property: PropertyData = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    this.properties.set(id, property);
    return property;
  }

  async findById(id: string): Promise<PropertyData | null> {
    return this.properties.get(id) || null;
  }

  async findMany(filters: PropertyFilterData): Promise<PaginatedPropertyData> {
    const allProperties = Array.from(this.properties.values());
    let filtered = allProperties;
    
    // Simple text search implementation for testing
    if (filters.textQuery) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(filters.textQuery!.toLowerCase()) ||
        p.description?.toLowerCase().includes(filters.textQuery!.toLowerCase())
      );
    }

    // Simple price filter
    if (filters.minPrice) {
      filtered = filtered.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice!);
    }

    const limit = filters.limit || 20;
    const limitedProperties = filtered.slice(0, limit);
    
    // Add computed fields
    const propertiesWithComputed = limitedProperties.map(p => ({
      ...p,
      pricePerSqm: p.area ? p.price / p.area : null,
      propertyAge: p.yearBuilt ? new Date().getFullYear() - p.yearBuilt : null,
    }));

    return {
      properties: propertiesWithComputed,
      pagination: {
        nextCursor: null,
        hasMore: filtered.length > limit,
        limit,
        totalEstimate: filtered.length,
      }
    };
  }

  async update(id: string, data: PropertyUpdateData): Promise<PropertyData> {
    const existing = this.properties.get(id);
    if (!existing) {
      throw new Error('Property not found');
    }

    const updated: PropertyData = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    this.properties.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.properties.has(id)) {
      throw new Error('Property not found');
    }
    this.properties.delete(id);
  }

  async count(filters?: PropertyFilterData): Promise<number> {
    return this.properties.size;
  }

  async getStats(): Promise<PropertyStats> {
    const properties = Array.from(this.properties.values());
    const total = properties.length;
    
    return {
      total,
      byStatus: {
        forSale: properties.filter(p => p.status === 'for_sale').length,
        forRent: properties.filter(p => p.status === 'for_rent').length,
        sold: properties.filter(p => p.status === 'sold').length,
      },
      pricing: {
        average: total > 0 ? properties.reduce((sum, p) => sum + p.price, 0) / total : 0,
        median: 0, // Simplified for test
        min: total > 0 ? Math.min(...properties.map(p => p.price)) : 0,
        max: total > 0 ? Math.max(...properties.map(p => p.price)) : 0,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  // Test helper methods
  clear() {
    this.properties.clear();
    this.idCounter = 1;
  }

  addProperty(property: PropertyData) {
    this.properties.set(property.id, property);
  }
}

describe('PropertyCore', () => {
  let gateway: MockPropertyDataGateway;
  let core: PropertyCore;

  const validPropertyData: PropertyCreateData = {
    title: 'Test Property',
    location: 'Lisbon, Portugal',
    price: 250000,
    status: 'for_sale',
    type: 'apartamento',
    description: 'A nice apartment',
    bedrooms: 2,
    bathrooms: 1,
    area: 80,
    yearBuilt: 2020,
  };

  beforeEach(() => {
    gateway = new MockPropertyDataGateway();
    core = new PropertyCore(gateway, DEFAULT_BUSINESS_CONFIG);
  });

  describe('createProperty', () => {
    it('should create a valid property', async () => {
      const result = await core.createProperty(validPropertyData);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^mock-id-\d+$/);
      expect(result.title).toBe(validPropertyData.title);
      expect(result.price).toBe(validPropertyData.price);
      expect(result.pricePerSqm).toBe(250000 / 80); // Computed field
      expect(result.propertyAge).toBe(new Date().getFullYear() - 2020); // Computed field
    });

    it('should reject property with empty title', async () => {
      const invalidData = { ...validPropertyData, title: '' };

      await expect(core.createProperty(invalidData))
        .rejects
        .toThrow(PropertyValidationError);
    });

    it('should reject property with negative price', async () => {
      const invalidData = { ...validPropertyData, price: -1000 };

      await expect(core.createProperty(invalidData))
        .rejects
        .toThrow(PropertyValidationError);
    });

    it('should reject property with price exceeding limit', async () => {
      const invalidData = { ...validPropertyData, price: 200_000_000 };

      await expect(core.createProperty(invalidData))
        .rejects
        .toThrow(PropertyValidationError);
    });

    it('should reject property with invalid coordinates', async () => {
      const invalidData = {
        ...validPropertyData,
        coordinates: { latitude: 100, longitude: 200 } // Invalid
      };

      await expect(core.createProperty(invalidData))
        .rejects
        .toThrow(PropertyValidationError);
    });

    it('should reject property with future year built', async () => {
      const invalidData = {
        ...validPropertyData,
        yearBuilt: new Date().getFullYear() + 1
      };

      await expect(core.createProperty(invalidData))
        .rejects
        .toThrow(PropertyValidationError);
    });
  });

  describe('getProperty', () => {
    it('should get existing property with computed fields', async () => {
      const created = await core.createProperty(validPropertyData);
      const retrieved = await core.getProperty(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.pricePerSqm).toBeDefined();
      expect(retrieved.propertyAge).toBeDefined();
    });

    it('should throw PropertyNotFoundError for non-existing property', async () => {
      await expect(core.getProperty('non-existing-id'))
        .rejects
        .toThrow(PropertyNotFoundError);
    });

    it('should validate property ID format', async () => {
      await expect(core.getProperty('invalid-id'))
        .rejects
        .toThrow(PropertyValidationError);
    });
  });

  describe('searchProperties', () => {
    beforeEach(async () => {
      // Add some test properties
      await core.createProperty({
        ...validPropertyData,
        title: 'Luxury Villa',
        price: 500000,
        area: 200,
      });
      
      await core.createProperty({
        ...validPropertyData,
        title: 'Small Apartment',
        price: 150000,
        area: 50,
      });
      
      await core.createProperty({
        ...validPropertyData,
        title: 'Modern Loft',
        price: 300000,
        area: 100,
      });
    });

    it('should search by text query', async () => {
      const result = await core.searchProperties({ textQuery: 'Villa' });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].title).toBe('Luxury Villa');
    });

    it('should filter by price range', async () => {
      const result = await core.searchProperties({
        minPrice: 200000,
        maxPrice: 400000
      });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].title).toBe('Modern Loft');
    });

    it('should validate and normalize filters', async () => {
      const result = await core.searchProperties({
        minPrice: 100000,
        limit: 50, // Should be normalized to max 100
      });

      expect(result.pagination.limit).toBe(50);
    });

    it('should reject invalid price range', async () => {
      await expect(core.searchProperties({
        minPrice: 500000,
        maxPrice: 300000 // min > max
      })).rejects.toThrow(PropertyValidationError);
    });
  });

  describe('updateProperty', () => {
    it('should update existing property', async () => {
      const created = await core.createProperty(validPropertyData);
      const updateData: PropertyUpdateData = {
        title: 'Updated Title',
        price: 300000,
      };

      const updated = await core.updateProperty(created.id, updateData);

      expect(updated.title).toBe('Updated Title');
      expect(updated.price).toBe(300000);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should throw PropertyNotFoundError for non-existing property', async () => {
      await expect(core.updateProperty('non-existing-id', { title: 'New Title' }))
        .rejects
        .toThrow(PropertyNotFoundError);
    });

    it('should validate update data', async () => {
      const created = await core.createProperty(validPropertyData);

      await expect(core.updateProperty(created.id, { price: -1000 }))
        .rejects
        .toThrow(PropertyValidationError);
    });
  });

  describe('deleteProperty', () => {
    it('should delete existing property', async () => {
      const created = await core.createProperty(validPropertyData);
      
      await core.deleteProperty(created.id);
      
      await expect(core.getProperty(created.id))
        .rejects
        .toThrow(PropertyNotFoundError);
    });

    it('should throw PropertyNotFoundError for non-existing property', async () => {
      await expect(core.deleteProperty('non-existing-id'))
        .rejects
        .toThrow(PropertyNotFoundError);
    });
  });

  describe('searchByText', () => {
    it('should search properties by text', async () => {
      await core.createProperty({
        ...validPropertyData,
        title: 'Beautiful Villa by the Sea',
      });

      const results = await core.searchByText('Villa');

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Villa');
    });

    it('should reject short queries', async () => {
      await expect(core.searchByText('ab'))
        .rejects
        .toThrow(PropertyValidationError);
    });

    it('should limit results', async () => {
      // Create multiple properties
      for (let i = 0; i < 25; i++) {
        await core.createProperty({
          ...validPropertyData,
          title: `Test Property ${i}`,
        });
      }

      const results = await core.searchByText('Test', 10);

      expect(results).toHaveLength(10);
    });
  });

  describe('findNearbyProperties', () => {
    it('should find properties near location', async () => {
      await core.createProperty({
        ...validPropertyData,
        coordinates: { latitude: 38.7223, longitude: -9.1393 }, // Lisbon
      });

      const results = await core.findNearbyProperties(38.7223, -9.1393, 10);

      expect(results).toHaveLength(1);
    });

    it('should validate coordinates', async () => {
      await expect(core.findNearbyProperties(100, 200, 5))
        .rejects
        .toThrow(PropertyValidationError);
    });

    it('should validate radius', async () => {
      await expect(core.findNearbyProperties(38.7223, -9.1393, 200))
        .rejects
        .toThrow(PropertyValidationError);
    });
  });

  describe('getStats', () => {
    it('should return property statistics', async () => {
      await core.createProperty({ ...validPropertyData, status: 'for_sale' });
      await core.createProperty({ ...validPropertyData, status: 'for_rent' });

      const stats = await core.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byStatus.forSale).toBe(1);
      expect(stats.byStatus.forRent).toBe(1);
      expect(stats.pricing.average).toBeGreaterThan(0);
    });
  });

  describe('isHealthy', () => {
    it('should return health status', async () => {
      const health = await core.isHealthy();
      expect(health).toBe(true);
    });
  });

  describe('business configuration', () => {
    it('should respect custom business config', () => {
      const customConfig = {
        ...DEFAULT_BUSINESS_CONFIG,
        maxPrice: 50_000_000,
      };

      const customCore = new PropertyCore(gateway, customConfig);

      expect(() => customCore['validatePropertyData']({
        ...validPropertyData,
        price: 75_000_000
      })).toThrow(PropertyValidationError);
    });
  });
});