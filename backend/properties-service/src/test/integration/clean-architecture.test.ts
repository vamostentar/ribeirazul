/**
 * Clean Architecture Integration Test
 * 
 * Tests the complete flow: Gateway → Core → API
 * Verifies all components work together correctly
 */

import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPropertiesAPI } from '../../api/properties-api';
import { DEFAULT_BUSINESS_CONFIG, PropertyCore } from '../../core/property-core';
import { PropertyCreateData } from '../../domain/property-types';
import { PrismaPropertyGateway } from '../../gateways/prisma-property-gateway';

// Test configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe('Clean Architecture Integration', () => {
  let prisma: PrismaClient;
  let gateway: PrismaPropertyGateway;
  let core: PropertyCore;
  let api: ReturnType<typeof createPropertiesAPI>;

  const testPropertyData: PropertyCreateData = {
    title: 'Integration Test Property',
    location: 'Test City, Portugal',
    price: 350000,
    status: 'for_sale',
    type: 'apartamento',
    description: 'A property for integration testing',
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
    contactEmail: 'test@example.com',
  };

  beforeEach(async () => {
    // Initialize components
    prisma = new PrismaClient({
      datasources: {
        db: { url: TEST_DATABASE_URL }
      }
    });

    // Clean up any existing test data
    await prisma.propertyImage.deleteMany();
    await prisma.property.deleteMany();

    gateway = new PrismaPropertyGateway(prisma);
    core = new PropertyCore(gateway, DEFAULT_BUSINESS_CONFIG);
    api = createPropertiesAPI(core);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.propertyImage.deleteMany();
    await prisma.property.deleteMany();
    await prisma.$disconnect();
  });

  describe('Full Property Lifecycle', () => {
    it('should create, read, update, and delete a property', async () => {
      // CREATE
      const createResponse = await api.createProperty(testPropertyData);
      
      expect(createResponse.success).toBe(true);
      expect(createResponse.data).toBeDefined();
      expect(createResponse.data?.title).toBe(testPropertyData.title);
      expect(createResponse.data?.pricePerSqm).toBe(350000 / 120); // Computed field
      expect(createResponse.data?.propertyAge).toBe(new Date().getFullYear() - 2018); // Computed field

      const propertyId = createResponse.data!.id;

      // READ
      const getResponse = await api.getProperty(propertyId);
      
      expect(getResponse.success).toBe(true);
      expect(getResponse.data?.id).toBe(propertyId);
      expect(getResponse.data?.coordinates).toEqual(testPropertyData.coordinates);
      expect(getResponse.data?.features).toEqual(testPropertyData.features);

      // UPDATE
      const updateData = {
        title: 'Updated Integration Test Property',
        price: 375000,
        description: 'Updated description',
      };

      const updateResponse = await api.updateProperty(propertyId, updateData);
      
      expect(updateResponse.success).toBe(true);
      expect(updateResponse.data?.title).toBe(updateData.title);
      expect(updateResponse.data?.price).toBe(updateData.price);
      expect(updateResponse.data?.pricePerSqm).toBe(375000 / 120); // Updated computed field

      // DELETE
      const deleteResponse = await api.deleteProperty(propertyId);
      
      expect(deleteResponse.success).toBe(true);

      // Verify deletion
      const getDeletedResponse = await api.getProperty(propertyId);
      
      expect(getDeletedResponse.success).toBe(false);
      expect(getDeletedResponse.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Create test properties
      await api.createProperty({
        ...testPropertyData,
        title: 'Luxury Villa',
        price: 750000,
        type: 'moradia',
        area: 250,
      });

      await api.createProperty({
        ...testPropertyData,
        title: 'Modern Apartment',
        price: 300000,
        type: 'apartamento',
        area: 80,
      });

      await api.createProperty({
        ...testPropertyData,
        title: 'Cozy Loft',
        price: 400000,
        type: 'loft',
        area: 100,
      });
    });

    it('should search properties with filters', async () => {
      const searchResponse = await api.searchProperties({
        minPrice: 350000,
        maxPrice: 500000,
        limit: 10,
      });

      expect(searchResponse.success).toBe(true);
      expect(searchResponse.data?.properties).toHaveLength(1);
      expect(searchResponse.data?.properties[0].title).toBe('Cozy Loft');
    });

    it('should perform text search', async () => {
      const textSearchResponse = await api.searchByText('Villa', 10);

      expect(textSearchResponse.success).toBe(true);
      expect(textSearchResponse.data).toHaveLength(1);
      expect(textSearchResponse.data?.[0].title).toBe('Luxury Villa');
    });

    it('should find nearby properties', async () => {
      const nearbyResponse = await api.findNearby(
        38.7223, // Lisbon coordinates
        -9.1393,
        10, // 10km radius
        10  // limit
      );

      expect(nearbyResponse.success).toBe(true);
      expect(nearbyResponse.data?.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create test properties with different statuses
      await api.createProperty({ ...testPropertyData, status: 'for_sale', price: 300000 });
      await api.createProperty({ ...testPropertyData, status: 'for_rent', price: 400000 });
      await api.createProperty({ ...testPropertyData, status: 'sold', price: 500000 });
    });

    it('should return property statistics', async () => {
      const statsResponse = await api.getStats();

      expect(statsResponse.success).toBe(true);
      expect(statsResponse.data?.total).toBe(3);
      expect(statsResponse.data?.byStatus.forSale).toBe(1);
      expect(statsResponse.data?.byStatus.forRent).toBe(1);
      expect(statsResponse.data?.byStatus.sold).toBe(1);
      expect(statsResponse.data?.pricing.average).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidData = {
        ...testPropertyData,
        title: '', // Invalid
        price: -1000, // Invalid
      };

      const response = await api.createProperty(invalidData);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle not found errors gracefully', async () => {
      const response = await api.getProperty('00000000-0000-4000-8000-000000000000');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('Health Check', () => {
    it('should report healthy status', async () => {
      const healthResponse = await api.healthCheck();

      expect(healthResponse.success).toBe(true);
      expect(healthResponse.data?.status).toBe('healthy');
    });
  });

  describe('Database Gateway', () => {
    it('should be replaceable (interface compliance)', () => {
      // This test verifies that the gateway interface is properly abstracted
      expect(gateway.create).toBeDefined();
      expect(gateway.findById).toBeDefined();
      expect(gateway.findMany).toBeDefined();
      expect(gateway.update).toBeDefined();
      expect(gateway.delete).toBeDefined();
      expect(gateway.count).toBeDefined();
      expect(gateway.getStats).toBeDefined();
      expect(gateway.isHealthy).toBeDefined();

      // The gateway should not expose Prisma-specific methods
      expect(gateway).not.toHaveProperty('$connect');
      expect(gateway).not.toHaveProperty('$disconnect');
      expect(gateway).not.toHaveProperty('property'); // Prisma model
    });
  });

  describe('Business Logic Isolation', () => {
    it('should enforce business rules regardless of gateway implementation', async () => {
      // Test that business rules are enforced at the core level
      const invalidProperty: PropertyCreateData = {
        title: 'Test Property',
        location: 'Test Location',
        price: 200_000_000, // Exceeds business limit
        status: 'for_sale',
      };

      const response = await api.createProperty(invalidProperty);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
      expect(response.error?.message).toContain('Price cannot exceed');
    });

    it('should apply computed fields consistently', async () => {
      const propertyWithArea: PropertyCreateData = {
        ...testPropertyData,
        price: 240000,
        area: 80,
        yearBuilt: 2020,
      };

      const response = await api.createProperty(propertyWithArea);

      expect(response.success).toBe(true);
      expect(response.data?.pricePerSqm).toBe(3000); // 240000 / 80
      expect(response.data?.propertyAge).toBe(new Date().getFullYear() - 2020);
    });
  });
});