import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanDatabase, createTestProperty, testPrisma, waitForDatabase } from '../setup-ephemeral';

describe('Property Routes Integration', () => {
  let app: FastifyInstance;
  
  beforeEach(async () => {
    await cleanDatabase();
    await waitForDatabase();
    
    // Mock prisma to point to ephemeral DB before importing app
    await vi.resetModules();
    vi.doMock('../../config/database', () => ({
      prisma: testPrisma,
      connectDatabase: async () => { await testPrisma.$connect(); },
      setupDatabaseShutdown: () => {},
    }));
    const { buildApp } = await import('../../app');
    app = await buildApp();
  });
  
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/properties', () => {
    it('should create a property successfully', async () => {
      const propertyData = createTestProperty();
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: propertyData,
      });
      
      expect(response.statusCode).toBe(201);
      
      const result = JSON.parse(response.body);
      expect(result.data).toBeDefined();
      expect(result.data.title).toBe(propertyData.title);
      expect(result.data.location).toBe(propertyData.location);
      expect(result.data.price).toBe(propertyData.price);
      expect(result.data.status).toBe('for_sale');
      expect(result.message).toBe('Property created successfully');
      expect(result.timestamp).toBeDefined();
    });

    it('should reject invalid property data', async () => {
      const invalidPropertyData = {
        title: 'A'.repeat(201), // Exceeds max length
        location: 'Lisbon',
        price: -1000, // Negative price
      };
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: invalidPropertyData,
      });
      
      expect(response.statusCode).toBe(400);
      
      const result = JSON.parse(response.body);
      expect(result.error).toBeDefined();
      expect(String(result.message)).toContain('must NOT have more than 200 characters');
    });

    it('should set default status when not provided', async () => {
      const minimalPropertyData = {
        title: 'Minimal Property',
        location: 'Lisbon',
        price: 250000,
      };
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: minimalPropertyData,
      });
      
      expect(response.statusCode).toBe(201);
      
      const result = JSON.parse(response.body);
      expect(result.data.status).toBe('for_sale');
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        title: 'Incomplete Property',
        // Missing location and price
      };
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: incompleteData,
      });
      
      expect(response.statusCode).toBe(400);
      
      const result = JSON.parse(response.body);
      expect(result.error).toBeDefined();
    });
  });

  describe('GET /api/v1/properties/:id', () => {
    it('should return property when found', async () => {
      // First create a property
      const propertyData = createTestProperty();
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: propertyData,
      });
      
      const createdProperty = JSON.parse(createResponse.body).data;
      
      // Then fetch it by ID
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/properties/${createdProperty.id}`,
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.id).toBe(createdProperty.id);
      expect(result.data.title).toBe(propertyData.title);
      expect(result.timestamp).toBeDefined();
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = '123e4567-e89b-42d3-a456-426614174000';
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/properties/${nonExistentId}`,
      });
      
      expect(response.statusCode).toBe(404);
      
      const result = JSON.parse(response.body);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/properties/${invalidId}`,
      });
      
      expect(response.statusCode).toBe(400);
      
      const result = JSON.parse(response.body);
      expect(result.error).toBeDefined();
    });
  });

  describe('GET /api/v1/properties', () => {
    beforeEach(async () => {
      // Create multiple properties for testing
      const properties = [
        createTestProperty({ title: 'Property 1', price: 200000, status: 'for_sale' }),
        createTestProperty({ title: 'Property 2', price: 300000, status: 'for_sale' }),
        createTestProperty({ title: 'Property 3', price: 400000, status: 'for_rent' }),
        createTestProperty({ title: 'Property 4', price: 500000, status: 'sold' }),
      ];
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase(); // Wait for database operations to complete
    });

    it('should return all properties with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?limit=10',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data).toHaveLength(4);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.hasMore).toBe(false);
      expect(result.timestamp).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?status=for_sale',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((property: any) => {
        expect(property.status).toBe('for_sale');
      });
    });

    it('should filter by price range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?minPrice=250000&maxPrice=450000',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((property: any) => {
        expect(property.price).toBeGreaterThanOrEqual(250000);
        expect(property.price).toBeLessThanOrEqual(450000);
      });
    });

    it('should filter by location', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?q=Property 1',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((property: any) => {
        expect(property.title).toContain('Property 1');
      });
    });

    it('should handle text search', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?q=Property',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?limit=2',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should handle cursor-based pagination', async () => {
      // First page
      const firstPageResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?limit=2',
      });
      
      const firstPage = JSON.parse(firstPageResponse.body);
      expect(firstPage.data).toHaveLength(2);
      expect(firstPage.pagination.hasMore).toBe(true);
      
      // Second page
      const secondPageResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/properties?limit=2&cursor=${firstPage.pagination.nextCursor}`,
      });
      
      const secondPage = JSON.parse(secondPageResponse.body);
      expect(secondPage.data.length).toBeGreaterThan(0);
      if (firstPage.data[0] && secondPage.data[0]) {
        expect(secondPage.data[0].id).not.toBe(firstPage.data[0].id);
      }
    });

    it('should handle simple response format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties',
        headers: {
          'x-response-format': 'simple',
        },
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBeDefined();
    });
  });

  describe('PUT /api/v1/properties/:id', () => {
    it('should update property successfully', async () => {
      // First create a property
      const propertyData = createTestProperty();
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: propertyData,
      });
      
      const createdProperty = JSON.parse(createResponse.body).data;
      
      // Then update it
      const updateData = {
        title: 'Updated Property',
        price: 350000,
        description: 'Updated description',
      };
      
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/properties/${createdProperty.id}`,
        payload: updateData,
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.title).toBe('Updated Property');
      expect(result.data.price).toBe(350000);
      expect(result.data.description).toBe('Updated description');
      expect(result.message).toBe('Property updated successfully');
      expect(result.timestamp).toBeDefined();
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = '123e4567-e89b-42d3-a456-426614174000';
      const updateData = { title: 'Updated' };
      
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/properties/${nonExistentId}`,
        payload: updateData,
      });
      
      expect(response.statusCode).toBe(404);
    });

    it('should reject invalid update data', async () => {
      // First create a property
      const propertyData = createTestProperty();
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: propertyData,
      });
      
      const createdProperty = JSON.parse(createResponse.body).data;
      
      // Then try to update with invalid data
      const invalidUpdateData = { price: -1000 };
      
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/properties/${createdProperty.id}`,
        payload: invalidUpdateData,
      });
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/properties/:id', () => {
    it('should delete property successfully', async () => {
      // First create a property
      const propertyData = createTestProperty();
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: propertyData,
      });
      
      const createdProperty = JSON.parse(createResponse.body).data;
      
      // Then delete it
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${createdProperty.id}`,
      });
      
      expect(response.statusCode).toBe(204);
      
      // Verify it was deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/properties/${createdProperty.id}`,
      });
      
      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = '123e4567-e89b-42d3-a456-426614174000';
      
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${nonExistentId}`,
      });
      
      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/properties-stats', () => {
    beforeEach(async () => {
      // Create properties with different statuses
      const properties = [
        createTestProperty({ price: 200000, status: 'for_sale' }),
        createTestProperty({ price: 300000, status: 'for_sale' }),
        createTestProperty({ price: 400000, status: 'for_rent' }),
        createTestProperty({ price: 500000, status: 'sold' }),
      ];
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
    });

    it('should return property statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties-stats',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.total).toBe(4);
      expect(result.data.byStatus).toBeDefined();
      expect(result.data.pricing).toBeDefined();
      expect(result.data.lastUpdated).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('GET /api/v1/properties/search', () => {
    beforeEach(async () => {
      // Create properties for search testing
      const properties = [
        createTestProperty({ title: 'Beautiful Apartment in Lisbon' }),
        createTestProperty({ title: 'Modern House in Porto' }),
        createTestProperty({ description: 'Cozy studio in the heart of Lisbon' }),
      ];
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
    });

    it('should search properties by text', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/search?q=Lisbon',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.query).toBe('Lisbon');
      expect(result.count).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should require search query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/search',
      });
      
      expect(response.statusCode).toBe(400);
    });

    it('should handle custom limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/search?q=Lisbon&limit=1',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/v1/properties/nearby', () => {
    beforeEach(async () => {
      // Create properties with coordinates
      const properties = [
        createTestProperty({
          title: 'Lisbon Center',
          coordinates: { latitude: 38.7223, longitude: -9.1393 },
        }),
        createTestProperty({
          title: 'Lisbon North',
          coordinates: { latitude: 38.7323, longitude: -9.1393 }, // ~1km north
        }),
        createTestProperty({
          title: 'Porto',
          coordinates: { latitude: 41.1579, longitude: -8.6291 }, // ~300km north
        }),
      ];
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
    });

    it('should find nearby properties', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/nearby?lat=38.7223&lng=-9.1393&radius=2',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.location).toEqual({ latitude: 38.7223, longitude: -9.1393 });
      expect(result.radiusKm).toBe(2);
      expect(result.count).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should require latitude and longitude', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/nearby?radius=5',
      });
      
      expect(response.statusCode).toBe(400);
    });

    it('should handle custom radius and limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/nearby?lat=38.7223&lng=-9.1393&radius=1&limit=5',
      });
      
      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.body);
      expect(result.radiusKm).toBe(1);
      expect(result.count).toBeLessThanOrEqual(5);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json',
        },
      });
      
      expect(response.statusCode).toBe(400);
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/properties/123',
      });
      
      expect(response.statusCode).toBe(404);
    });

    it('should handle invalid routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/invalid-route',
      });
      
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Performance and load testing', () => {
    it('should handle multiple concurrent requests', async () => {
      // Create multiple properties first
      const properties = Array.from({ length: 10 }, (_, i) =>
        createTestProperty({ title: `Property ${i + 1}` })
      );
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
      
      // Make multiple concurrent requests
      const startTime = Date.now();
      const promises = Array.from({ length: 5 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/v1/properties?limit=5',
        })
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle large result sets efficiently', async () => {
      // Create many properties
      const properties = Array.from({ length: 50 }, (_, i) =>
        createTestProperty({ title: `Property ${i + 1}` })
      );
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
      
      // Test pagination with large dataset
      const startTime = Date.now();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?limit=20',
      });
      const endTime = Date.now();
      
      expect(response.statusCode).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds
      
      const result = JSON.parse(response.body);
      expect(result.data).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
    });
  });
});
