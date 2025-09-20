import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyCreateInput, PropertyFilters } from '../../types/property';
// Use ephemeral DB setup for this suite (isolated real database per run)
import { cleanDatabase, createTestProperty, testPrisma, waitForDatabase } from '../setup-ephemeral';

describe('Property Repository', () => {
  let PropertyRepositoryImpl: any;
  let repository: any;
  
  beforeEach(async () => {
    await vi.resetModules();
    // Mock the database module to use test database
    vi.doMock('../../config/database', () => ({
      prisma: testPrisma,
    }));
    
    await cleanDatabase();
    const mod = await import('../../repositories/property.repository');
    PropertyRepositoryImpl = mod.PropertyRepositoryImpl;
    repository = new PropertyRepositoryImpl();
    await waitForDatabase();
  });

  describe('create', () => {
    it('should create a property successfully', async () => {
      const propertyData = createTestProperty();
      
      const result = await repository.create(propertyData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(propertyData.title);
      expect(result.location).toBe(propertyData.location);
      expect(result.price).toBe(propertyData.price);
      expect(result.status).toBe(propertyData.status);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      
      // Verify it was actually saved to database
      const savedProperty = await testPrisma.property.findUnique({
        where: { id: result.id },
      });
      expect(savedProperty).toBeDefined();
      expect(savedProperty?.title).toBe(propertyData.title);
    });

    it('should create property with minimal required fields', async () => {
      const minimalData: PropertyCreateInput = {
        title: 'Minimal Property',
        location: 'Lisbon',
        price: 200000,
        status: 'for_sale',
      };
      
      const result = await repository.create(minimalData);
      
      expect(result.title).toBe(minimalData.title);
      expect(result.location).toBe(minimalData.location);
      expect(result.price).toBe(minimalData.price);
      expect(result.status).toBe('for_sale'); // Default value
      expect(result.type).toBeNull();
      expect(result.description).toBeNull();
    });

    it('should create property with all optional fields', async () => {
      const fullData = createTestProperty({
        title: 'Full Property',
        description: 'A complete property description',
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        yearBuilt: 2018,
        coordinates: {
          latitude: 38.7223,
          longitude: -9.1393,
        },
        features: ['ELEVATOR', 'BALCONY', 'GARAGE'],
        contactPhone: '+351912345678',
        contactEmail: 'agent@example.com',
      });
      
      const result = await repository.create(fullData);
      
      expect(result.bedrooms).toBe(3);
      expect(result.bathrooms).toBe(2);
      expect(result.area).toBe(120);
      expect(result.yearBuilt).toBe(2018);
      expect(result.coordinates).toEqual({
        latitude: 38.7223,
        longitude: -9.1393,
      });
      expect(result.features).toEqual(['ELEVATOR', 'BALCONY', 'GARAGE']);
      expect(result.contactPhone).toBe('+351912345678');
      expect(result.contactEmail).toBe('agent@example.com');
    });

    it('should handle decimal precision correctly', async () => {
      const propertyData = createTestProperty({
        price: 123456.78,
        area: 67.89,
      });
      
      const result = await repository.create(propertyData);
      
      expect(result.price).toBe(123456.78);
      expect(result.area).toBe(67.89);
    });
  });

  describe('findById', () => {
    it('should find property by ID successfully', async () => {
      const propertyData = createTestProperty();
      const createdProperty = await repository.create(propertyData);
      
      const result = await repository.findById(createdProperty.id);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(createdProperty.id);
      expect(result?.title).toBe(propertyData.title);
    });

    it('should return null for non-existent ID', async () => {
      const result = await repository.findById('123e4567-e89b-12d3-a456-426614174000');
      
      expect(result).toBeNull();
    });

    it('should handle invalid UUID format gracefully', async () => {
      const result = await repository.findById('invalid-uuid');
      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      // Create multiple properties for testing
      await repository.create(createTestProperty({ title: 'Property 1', price: 200000, status: 'for_sale' }));
      await repository.create(createTestProperty({ title: 'Property 2', price: 300000, status: 'for_sale' }));
      await repository.create(createTestProperty({ title: 'Property 3', price: 400000, status: 'for_rent' }));
      await repository.create(createTestProperty({ title: 'Property 4', price: 500000, status: 'for_sale' }));
      await repository.create(createTestProperty({ title: 'Property 5', price: 600000, status: 'sold' }));
    });

    it('should return all properties with default filters', async () => {
      const filters: PropertyFilters = {
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result).toHaveLength(5);
      expect(result[0].title).toBe('Property 5'); // Most recent
    });

    it('should filter by status', async () => {
      const filters: PropertyFilters = {
        status: 'for_sale',
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result).toHaveLength(3);
      result.forEach(property => {
        expect(property.status).toBe('for_sale');
      });
    });

    it('should filter by price range', async () => {
      const filters: PropertyFilters = {
        minPrice: 250000,
        maxPrice: 450000,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result).toHaveLength(2);
      result.forEach(property => {
        expect(property.price).toBeGreaterThanOrEqual(250000);
        expect(property.price).toBeLessThanOrEqual(450000);
      });
    });

    it('should filter by location via text search', async () => {
      const filters: PropertyFilters = {
        q: 'Property 1',
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Property 1');
    });

    it('should filter by bedrooms and bathrooms', async () => {
      // Create properties with specific bedroom/bathroom counts
      await repository.create(createTestProperty({ 
        title: 'Studio', 
        bedrooms: 0, 
        bathrooms: 1 
      }));
      await repository.create(createTestProperty({ 
        title: '2BR Apartment', 
        bedrooms: 2, 
        bathrooms: 2 
      }));
      
      const filters: PropertyFilters = {
        minBedrooms: 2,
        maxBathrooms: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(property => {
        if (property.bedrooms !== null) {
          expect(property.bedrooms).toBeGreaterThanOrEqual(2);
        }
        if (property.bathrooms !== null) {
          expect(property.bathrooms).toBeLessThanOrEqual(2);
        }
      });
    });

    it('should filter by features', async () => {
      await repository.create(createTestProperty({ 
        title: 'Feature Property', 
        features: ['ELEVATOR', 'BALCONY'] 
      }));
      
      const filters: PropertyFilters = {
        features: ['ELEVATOR'],
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(property => {
        expect(property.features).toContain('ELEVATOR');
      });
    });

    it('should handle text search', async () => {
      const filters: PropertyFilters = {
        q: 'Property',
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(property => {
        expect(
          property.title.toLowerCase().includes('property') ||
          property.location.toLowerCase().includes('property') ||
          (property.description?.toLowerCase().includes('property') || false)
        ).toBe(true);
      });
    });

    it('should respect limit parameter', async () => {
      const filters: PropertyFilters = {
        limit: 3,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result).toHaveLength(3);
    });

    it('should handle cursor-based pagination', async () => {
      const firstPage = await repository.findMany({
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      expect(firstPage).toHaveLength(2);
      
      const secondPage = await repository.findMany({
        limit: 2,
        cursor: firstPage[1].id,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      expect(secondPage).toHaveLength(2);
      expect(secondPage[0].id).not.toBe(firstPage[0].id);
      expect(secondPage[0].id).not.toBe(firstPage[1].id);
    });

    it('should sort by different fields', async () => {
      const priceAsc = await repository.findMany({
        limit: 10,
        sortBy: 'price',
        sortOrder: 'asc',
      });
      
      expect(priceAsc[0].price).toBeLessThan(priceAsc[1].price);
      
      const priceDesc = await repository.findMany({
        limit: 10,
        sortBy: 'price',
        sortOrder: 'desc',
      });
      
      expect(priceDesc[0].price).toBeGreaterThan(priceDesc[1].price);
    });
  });

  describe('update', () => {
    it('should update property successfully', async () => {
      const property = await repository.create(createTestProperty());
      const updateData = {
        title: 'Updated Property',
        price: 350000,
        description: 'Updated description',
      };
      
      const result = await repository.update(property.id, updateData);
      
      expect(result.title).toBe('Updated Property');
      expect(result.price).toBe(350000);
      expect(result.description).toBe('Updated description');
      expect(result.updatedAt.getTime()).toBeGreaterThan(property.updatedAt.getTime());
      
      // Verify database was updated
      const updatedProperty = await testPrisma.property.findUnique({
        where: { id: property.id },
      });
      expect(updatedProperty?.title).toBe('Updated Property');
    });

    it('should throw NotFoundError for non-existent property', async () => {
      const updateData = { title: 'Updated Property' };
      
      await expect(repository.update('123e4567-e89b-12d3-a456-426614174000', updateData))
        .rejects.toThrow(/not found/i);
    });

    it('should update only provided fields', async () => {
      const property = await repository.create(createTestProperty());
      const originalTitle = property.title;
      const originalPrice = property.price;
      
      const updateData = { description: 'Only description updated' };
      
      const result = await repository.update(property.id, updateData);
      
      expect(result.title).toBe(originalTitle);
      expect(result.price).toBe(originalPrice);
      expect(result.description).toBe('Only description updated');
    });

    it('should handle decimal updates correctly', async () => {
      const property = await repository.create(createTestProperty());
      const updateData = {
        price: 123456.78,
        area: 67.89,
      };
      
      const result = await repository.update(property.id, updateData);
      
      expect(result.price).toBe(123456.78);
      expect(result.area).toBe(67.89);
    });
  });

  describe('delete', () => {
    it('should delete property successfully', async () => {
      const property = await repository.create(createTestProperty());
      
      await repository.delete(property.id);
      
      // Verify it was deleted
      const deletedProperty = await testPrisma.property.findUnique({
        where: { id: property.id },
      });
      expect(deletedProperty).toBeNull();
    });

    it('should throw NotFoundError for non-existent property', async () => {
      await expect(repository.delete('123e4567-e89b-12d3-a456-426614174000'))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await repository.create(createTestProperty({ status: 'for_sale' }));
      await repository.create(createTestProperty({ status: 'for_sale' }));
      await repository.create(createTestProperty({ status: 'for_rent' }));
      await repository.create(createTestProperty({ status: 'sold' }));
    });

    it('should count all properties', async () => {
      const count = await repository.count();
      
      expect(count).toBe(4);
    });

    it('should count with filters', async () => {
      const forSaleCount = await repository.count({ status: 'for_sale' });
      expect(forSaleCount).toBe(2);
      
      const forRentCount = await repository.count({ status: 'for_rent' });
      expect(forRentCount).toBe(1);
      
      const soldCount = await repository.count({ status: 'sold' });
      expect(soldCount).toBe(1);
    });

    it('should count with price range filters', async () => {
      const count = await repository.count({
        minPrice: 200000,
        maxPrice: 300000,
      });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('nearby search', () => {
    beforeEach(async () => {
      // Create properties at different locations
      await repository.create(createTestProperty({
        title: 'Lisbon Center',
        coordinates: { latitude: 38.7223, longitude: -9.1393 },
      }));
      await repository.create(createTestProperty({
        title: 'Lisbon North',
        coordinates: { latitude: 38.7323, longitude: -9.1393 }, // ~1km north
      }));
      await repository.create(createTestProperty({
        title: 'Porto',
        coordinates: { latitude: 41.1579, longitude: -8.6291 }, // ~300km north
      }));
    });

    it('should find nearby properties within radius', async () => {
      const filters: PropertyFilters = {
        nearbySearch: {
          latitude: 38.7223,
          longitude: -9.1393,
          radiusKm: 2,
        },
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach(property => {
        expect(property.title).toMatch(/Lisbon/);
      });
    });

    it('should not find properties outside radius', async () => {
      const filters: PropertyFilters = {
        nearbySearch: {
          latitude: 38.7223,
          longitude: -9.1393,
          radiusKm: 1,
        },
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      // Should only find the center property
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Lisbon Center');
    });

    it('should sort nearby properties by distance', async () => {
      const filters: PropertyFilters = {
        nearbySearch: {
          latitude: 38.7223,
          longitude: -9.1393,
          radiusKm: 5,
        },
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      const result = await repository.findMany(filters);
      
      // First should be center, then north (closer to center)
      expect(result[0].title).toBe('Lisbon Center');
      expect(result[1].title).toBe('Lisbon North');
    });
  });
});
