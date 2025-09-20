/**
 * PropertyCore Unit Tests - Completely Isolated
 * 
 * Testing pure business logic WITHOUT any external dependencies
 * Following Eskil Steenberg's principle: "Business logic should be testable without external dependencies"
 * 
 * NO DATABASE, NO NETWORK, NO FILES - just pure business logic
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

// Mock gateway implementation for testing - PURE IN-MEMORY
class InMemoryPropertyGateway implements PropertyDataGateway {
  private properties: Map<string, PropertyData> = new Map();
  private idCounter = 1;

  async create(data: PropertyCreateData): Promise<PropertyData> {
    // Generate valid UUID for compatibility with business logic
    const id = `00000000-0000-4000-8000-${String(this.idCounter++).padStart(12, '0')}`;
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
    
    // Simple filtering for testing
    if (filters.textQuery) {
      const query = filters.textQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice!);
    }

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    // Simple nearby search simulation
    if (filters.nearbySearch) {
      filtered = filtered.filter(p => 
        p.coordinates && 
        Math.abs(p.coordinates.latitude - filters.nearbySearch!.latitude) < 0.1 &&
        Math.abs(p.coordinates.longitude - filters.nearbySearch!.longitude) < 0.1
      );
    }

    const limit = filters.limit || 20;
    const limitedProperties = filtered.slice(0, limit);
    
    // Add computed fields
    const propertiesWithComputed = limitedProperties.map(p => ({
      ...p,
      pricePerSqm: p.area ? Math.round(p.price / p.area) : null,
      propertyAge: p.yearBuilt ? new Date().getFullYear() - p.yearBuilt : null,
    }));

    return {
      properties: propertiesWithComputed,
      pagination: {
        nextCursor: filtered.length > limit ? 'next-cursor' : null,
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
    
    if (total === 0) {
      return {
        total: 0,
        byStatus: { forSale: 0, forRent: 0, sold: 0 },
        pricing: { average: 0, median: 0, min: 0, max: 0 },
        lastUpdated: new Date().toISOString(),
      };
    }

    const prices = properties.map(p => p.price).sort((a, b) => a - b);
    
    return {
      total,
      byStatus: {
        forSale: properties.filter(p => p.status === 'for_sale').length,
        forRent: properties.filter(p => p.status === 'for_rent').length,
        sold: properties.filter(p => p.status === 'sold').length,
      },
      pricing: {
        average: Math.round(prices.reduce((sum, p) => sum + p, 0) / total),
        median: prices[Math.floor(total / 2)],
        min: prices[0],
        max: prices[total - 1],
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async isHealthy(): Promise<boolean> {
    return true; // In-memory gateway is always healthy
  }

  // Test helper methods
  clear() {
    this.properties.clear();
    this.idCounter = 1;
  }

  getProperty(id: string): PropertyData | undefined {
    return this.properties.get(id);
  }

  getAllProperties(): PropertyData[] {
    return Array.from(this.properties.values());
  }
}

// ============================================================================
// TESTS - Pure Business Logic Testing
// ============================================================================

describe('PropertyCore - Pure Business Logic', () => {
  let gateway: InMemoryPropertyGateway;
  let core: PropertyCore;

  const validProperty: PropertyCreateData = {
    title: 'Beautiful Apartment',
    location: 'Lisbon, Portugal',
    price: 350000,
    status: 'for_sale',
    type: 'apartamento',
    description: 'A stunning apartment with great views',
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    yearBuilt: 2018,
    coordinates: {
      latitude: 38.7223,
      longitude: -9.1393,
    },
    features: ['parking', 'balcony', 'elevator'],
    contactPhone: '+351999999999',
    contactEmail: 'owner@example.com',
  };

  beforeEach(() => {
    gateway = new InMemoryPropertyGateway();
    core = new PropertyCore(gateway, DEFAULT_BUSINESS_CONFIG);
  });

  // ==================== PROPERTY CREATION TESTS ====================

  describe('Property Creation - Business Rules', () => {
    it('should create valid property with computed fields', async () => {
      const result = await core.createProperty(validProperty);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^00000000-0000-4000-8000-/);
      expect(result.title).toBe(validProperty.title);
      expect(result.price).toBe(validProperty.price);
      
      // Computed fields (note: these are calculated by the gateway in our test)
      expect(result.pricePerSqm).toBe(Math.round(350000 / 120)); // 2917
      expect(result.propertyAge).toBe(new Date().getFullYear() - 2018);
      
      // Verify data persisted
      const stored = gateway.getProperty(result.id);
      expect(stored).toBeDefined();
      expect(stored?.title).toBe(validProperty.title);
    });

    it('should reject empty title', async () => {
      const invalid = { ...validProperty, title: '' };
      
      await expect(core.createProperty(invalid))
        .rejects.toThrow(PropertyValidationError);
    });

    it('should reject negative price', async () => {
      const invalid = { ...validProperty, price: -100 };
      
      await expect(core.createProperty(invalid))
        .rejects.toThrow('Price must be positive');
    });

    it('should reject price exceeding business limit', async () => {
      const invalid = { ...validProperty, price: 200_000_000 }; // Exceeds 100M limit
      
      await expect(core.createProperty(invalid))
        .rejects.toThrow('Price cannot exceed');
    });

    it('should reject invalid coordinates', async () => {
      const invalid = {
        ...validProperty,
        coordinates: { latitude: 200, longitude: 300 } // Invalid
      };
      
      await expect(core.createProperty(invalid))
        .rejects.toThrow(PropertyValidationError);
    });

    it('should reject future year built', async () => {
      const invalid = {
        ...validProperty,
        yearBuilt: new Date().getFullYear() + 10
      };
      
      await expect(core.createProperty(invalid))
        .rejects.toThrow(PropertyValidationError);
    });

    it('should apply default values correctly', async () => {
      const minimal: PropertyCreateData = {
        title: 'Minimal Property',
        location: 'Test Location',
        price: 200000,
        status: 'for_sale',
      };

      const result = await core.createProperty(minimal);

      expect(result.type).toBeUndefined();
      expect(result.pricePerSqm).toBeNull(); // No area provided
      expect(result.propertyAge).toBeNull(); // No year built
    });
  });

  // ==================== PROPERTY RETRIEVAL TESTS ====================

  describe('Property Retrieval', () => {
    it('should get existing property with computed fields', async () => {
      const created = await core.createProperty(validProperty);
      const retrieved = await core.getProperty(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.pricePerSqm).toBeDefined();
      expect(retrieved.propertyAge).toBeDefined();
      expect(retrieved.title).toBe(validProperty.title);
    });

    it('should throw PropertyNotFoundError for non-existing property', async () => {
      await expect(core.getProperty('00000000-0000-4000-8000-000000000999'))
        .rejects.toThrow(PropertyNotFoundError);
    });

    it('should validate property ID format', async () => {
      await expect(core.getProperty(''))
        .rejects.toThrow(PropertyValidationError);
    });
  });

  // ==================== SEARCH FUNCTIONALITY TESTS ====================

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Create test data
      await core.createProperty({
        ...validProperty,
        title: 'Luxury Villa',
        price: 750000,
        area: 300,
        type: 'moradia',
      });
      
      await core.createProperty({
        ...validProperty,
        title: 'Small Apartment',
        price: 200000,
        area: 60,
        type: 'apartamento',
      });
      
      await core.createProperty({
        ...validProperty,
        title: 'Modern Loft',
        price: 400000,
        area: 100,
        type: 'loft',
        description: 'A beautiful modern loft downtown',
      });
    });

    it('should search by text query in title', async () => {
      const result = await core.searchProperties({ textQuery: 'Villa' });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].title).toBe('Luxury Villa');
    });

    it('should search by text query in description', async () => {
      const result = await core.searchProperties({ textQuery: 'modern' });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].title).toBe('Modern Loft');
    });

    it('should filter by price range', async () => {
      const result = await core.searchProperties({
        minPrice: 300000,
        maxPrice: 500000
      });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].title).toBe('Modern Loft');
      expect(result.properties[0].price).toBe(400000);
    });

    it('should filter by property type', async () => {
      const result = await core.searchProperties({ type: 'apartamento' });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].title).toBe('Small Apartment');
    });

    it('should filter by status', async () => {
      const result = await core.searchProperties({ status: 'for_sale' });

      expect(result.properties.length).toBeGreaterThan(0);
      result.properties.forEach(p => {
        expect(p.status).toBe('for_sale');
      });
    });

    it('should handle empty search results', async () => {
      const result = await core.searchProperties({ textQuery: 'non-existent' });

      expect(result.properties).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should validate price range logic', async () => {
      await expect(core.searchProperties({
        minPrice: 500000,
        maxPrice: 300000 // min > max
      })).rejects.toThrow(PropertyValidationError);
    });

    it('should apply pagination correctly', async () => {
      const result = await core.searchProperties({ limit: 2 });

      expect(result.properties.length).toBeLessThanOrEqual(2);
      expect(result.pagination.limit).toBe(2);
    });
  });

  // ==================== TEXT SEARCH TESTS ====================

  describe('Text Search', () => {
    beforeEach(async () => {
      await core.createProperty({
        ...validProperty,
        title: 'Beautiful Villa by the Sea',
        description: 'Amazing ocean views',
      });
      
      await core.createProperty({
        ...validProperty,
        title: 'City Center Apartment',
        description: 'Perfect location in downtown',
      });
    });

    it('should find properties by text', async () => {
      const results = await core.searchByText('Villa');

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Villa');
    });

    it('should be case insensitive', async () => {
      const results = await core.searchByText('villa');

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Villa');
    });

    it('should search in descriptions', async () => {
      const results = await core.searchByText('ocean');

      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('ocean');
    });

    it('should reject short queries', async () => {
      await expect(core.searchByText('ab'))
        .rejects.toThrow(PropertyValidationError);
    });

    it('should respect limit parameter', async () => {
      const results = await core.searchByText('apartment', 1);

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  // ==================== NEARBY SEARCH TESTS ====================

  describe('Nearby Search', () => {
    beforeEach(async () => {
      await core.createProperty({
        ...validProperty,
        title: 'Lisbon Apartment',
        coordinates: { latitude: 38.7223, longitude: -9.1393 }, // Lisbon
      });
      
      await core.createProperty({
        ...validProperty,
        title: 'Porto House',
        coordinates: { latitude: 41.1579, longitude: -8.6291 }, // Porto
      });
    });

    it('should find nearby properties', async () => {
      const results = await core.findNearbyProperties(
        38.7223, -9.1393, 10 // Near Lisbon
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Lisbon Apartment');
    });

    it('should validate coordinates', async () => {
      await expect(core.findNearbyProperties(200, 300, 5))
        .rejects.toThrow(PropertyValidationError);
    });

    it('should validate radius', async () => {
      await expect(core.findNearbyProperties(38.7223, -9.1393, 200))
        .rejects.toThrow(PropertyValidationError);
    });
  });

  // ==================== PROPERTY UPDATE TESTS ====================

  describe('Property Updates', () => {
    it('should update existing property', async () => {
      const created = await core.createProperty(validProperty);
      const updateData = {
        title: 'Updated Amazing Apartment',
        price: 375000,
      };

      const updated = await core.updateProperty(created.id, updateData);

      expect(updated.title).toBe('Updated Amazing Apartment');
      expect(updated.price).toBe(375000);
      expect(updated.pricePerSqm).toBe(Math.round(375000 / 120)); // Recomputed
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should validate update data', async () => {
      const created = await core.createProperty(validProperty);

      await expect(core.updateProperty(created.id, { price: -1000 }))
        .rejects.toThrow(PropertyValidationError);
    });

    it('should throw PropertyNotFoundError for non-existing property', async () => {
      await expect(core.updateProperty('00000000-0000-4000-8000-000000000999', { title: 'New Title' }))
        .rejects.toThrow(PropertyNotFoundError);
    });
  });

  // ==================== PROPERTY DELETION TESTS ====================

  describe('Property Deletion', () => {
    it('should delete existing property', async () => {
      const created = await core.createProperty(validProperty);
      
      await core.deleteProperty(created.id);
      
      // Verify deletion
      await expect(core.getProperty(created.id))
        .rejects.toThrow(PropertyNotFoundError);
    });

    it('should throw PropertyNotFoundError for non-existing property', async () => {
      await expect(core.deleteProperty('00000000-0000-4000-8000-000000000999'))
        .rejects.toThrow(PropertyNotFoundError);
    });
  });

  // ==================== STATISTICS TESTS ====================

  describe('Statistics', () => {
    it('should return property statistics', async () => {
      await core.createProperty({ ...validProperty, status: 'for_sale', price: 300000 });
      await core.createProperty({ ...validProperty, status: 'for_rent', price: 400000 });
      await core.createProperty({ ...validProperty, status: 'sold', price: 500000 });

      const stats = await core.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.forSale).toBe(1);
      expect(stats.byStatus.forRent).toBe(1);
      expect(stats.byStatus.sold).toBe(1);
      expect(stats.pricing.average).toBe(400000);
      expect(stats.pricing.min).toBe(300000);
      expect(stats.pricing.max).toBe(500000);
    });

    it('should handle empty statistics', async () => {
      const stats = await core.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byStatus.forSale).toBe(0);
      expect(stats.pricing.average).toBe(0);
    });
  });

  // ==================== HEALTH CHECK TESTS ====================

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const isHealthy = await core.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  // ==================== BUSINESS CONFIGURATION TESTS ====================

  describe('Business Configuration', () => {
    it('should respect custom business configuration', () => {
      const customConfig = {
        ...DEFAULT_BUSINESS_CONFIG,
        maxPrice: 50_000_000, // Lower limit
        minSearchQueryLength: 2, // Shorter queries allowed
      };

      const customCore = new PropertyCore(gateway, customConfig);

      // Should reject price above custom limit
      expect(async () => {
        await customCore.createProperty({
          ...validProperty,
          price: 75_000_000
        });
      }).rejects.toThrow(PropertyValidationError);
    });

    it('should use default configuration when none provided', () => {
      const defaultCore = new PropertyCore(gateway); // No config

      expect(defaultCore).toBeDefined();
    });
  });
});

// This test proves the Clean Architecture principle:
// "Business logic is 100% independent of external systems"
describe('🏗️ Clean Architecture Verification', () => {
  it('should work without any external dependencies', async () => {
    const gateway = new InMemoryPropertyGateway();
    const core = new PropertyCore(gateway);
    
    // Create property
    const created = await core.createProperty({
      title: 'Test Property',
      location: 'Test Location',
      price: 300000,
      status: 'for_sale',
    });
    
    // Read property
    const retrieved = await core.getProperty(created.id);
    
    // Update property
    const updated = await core.updateProperty(created.id, { 
      title: 'Updated Property' 
    });
    
    // Search properties
    const searched = await core.searchProperties({ 
      textQuery: 'Updated' 
    });
    
    // All operations successful without database, network, or files
    expect(retrieved).toBeDefined();
    expect(updated.title).toBe('Updated Property');
    expect(searched.properties).toHaveLength(1);
    
    console.log('✅ Clean Architecture verified: 100% database independent!');
  });
});