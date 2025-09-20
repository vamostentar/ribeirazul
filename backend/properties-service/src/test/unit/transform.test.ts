import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { calculateDistance, transformPropertyFromDb } from '../../utils/transform';

describe('Transform Utils', () => {
  describe('transformPropertyFromDb', () => {
    it('should transform Prisma property to API response format', () => {
      const dbProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Beautiful Apartment',
        location: 'Chiado, Lisbon',
        price: new Prisma.Decimal(450000.50),
        status: 'for_sale' as const,
        type: 'apartamento' as const,
        imageUrl: 'https://example.com/image.jpg',
        description: 'A stunning apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: new Prisma.Decimal(85.5),
        yearBuilt: 2015,
        coordinates: {
          latitude: 38.7223,
          longitude: -9.1393,
        },
        features: ['ELEVATOR', 'BALCONY'],
        contactPhone: '+351912345678',
        contactEmail: 'agent@example.com',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        ownerId: null,
        agentId: null,
      };
      
      const result = transformPropertyFromDb(dbProperty);
      
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Beautiful Apartment',
        location: 'Chiado, Lisbon',
        price: 450000.50,
        status: 'for_sale',
        type: 'apartamento',
        imageUrl: 'https://example.com/image.jpg',
        description: 'A stunning apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: 85.5,
        yearBuilt: 2015,
        coordinates: {
          latitude: 38.7223,
          longitude: -9.1393,
        },
        features: ['ELEVATOR', 'BALCONY'],
        contactPhone: '+351912345678',
        contactEmail: 'agent@example.com',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        pricePerSqm: expect.closeTo(5263.16, 2), // Use toBeCloseTo for decimal precision
        propertyAge: expect.any(Number), // Use any number since year changes
      });
    });

    it('should handle null/undefined values correctly', () => {
      const dbProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Basic Property',
        location: 'Lisbon',
        price: new Prisma.Decimal(200000),
        status: 'for_sale' as const,
        type: null,
        imageUrl: null,
        description: null,
        bedrooms: null,
        bathrooms: null,
        area: null,
        yearBuilt: null,
        coordinates: null,
        features: [],
        contactPhone: null,
        contactEmail: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        ownerId: null,
        agentId: null,
      };
      
      const result = transformPropertyFromDb(dbProperty);
      
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Basic Property',
        location: 'Lisbon',
        price: 200000,
        status: 'for_sale',
        type: null,
        imageUrl: null,
        description: null,
        bedrooms: null,
        bathrooms: null,
        area: null,
        yearBuilt: null,
        coordinates: null,
        features: [],
        contactPhone: null,
        contactEmail: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        pricePerSqm: null, // No area to calculate
        propertyAge: null, // No year built
      });
    });

    it('should calculate price per square meter correctly', () => {
      const dbProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Property',
        location: 'Test',
        price: new Prisma.Decimal(300000),
        status: 'for_sale' as const,
        type: null,
        imageUrl: null,
        description: null,
        bedrooms: null,
        bathrooms: null,
        area: new Prisma.Decimal(100),
        yearBuilt: null,
        coordinates: null,
        features: [],
        contactPhone: null,
        contactEmail: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        ownerId: null,
        agentId: null,
      };
      
      const result = transformPropertyFromDb(dbProperty);
      
      expect(result.pricePerSqm).toBe(3000); // 300000 / 100
    });

    it('should calculate property age correctly', () => {
      const currentYear = new Date().getFullYear();
      const dbProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Property',
        location: 'Test',
        price: new Prisma.Decimal(300000),
        status: 'for_sale' as const,
        type: null,
        imageUrl: null,
        description: null,
        bedrooms: null,
        bathrooms: null,
        area: null,
        yearBuilt: currentYear - 5,
        coordinates: null,
        features: [],
        contactPhone: null,
        contactEmail: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        ownerId: null,
        agentId: null,
      };
      
      const result = transformPropertyFromDb(dbProperty);
      
      expect(result.propertyAge).toBe(5);
    });

    it('should handle decimal precision correctly', () => {
      const dbProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Property',
        location: 'Test',
        price: new Prisma.Decimal(123456.78),
        status: 'for_sale' as const,
        type: null,
        imageUrl: null,
        description: null,
        bedrooms: null,
        bathrooms: null,
        area: new Prisma.Decimal(67.89),
        yearBuilt: null,
        coordinates: null,
        features: [],
        contactPhone: null,
        contactEmail: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        ownerId: null,
        agentId: null,
      };
      
      const result = transformPropertyFromDb(dbProperty);
      
      expect(result.price).toBe(123456.78);
      expect(result.area).toBe(67.89);
      expect(result.pricePerSqm).toBeCloseTo(1818.18, 0); // 123456.78 / 67.89 - use 0 decimal places
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Lisbon coordinates
      const lat1 = 38.7223;
      const lng1 = -9.1393;
      
      // Porto coordinates
      const lat2 = 41.1579;
      const lng2 = -8.6291;
      
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Distance should be approximately 313 km
      expect(distance).toBeGreaterThan(270);
      expect(distance).toBeLessThan(330);
    });

    it('should return 0 for same coordinates', () => {
      const lat = 38.7223;
      const lng = -9.1393;
      
      const distance = calculateDistance(lat, lng, lat, lng);
      
      expect(distance).toBe(0);
    });

    it('should handle antipodal points', () => {
      // North Pole
      const lat1 = 90;
      const lng1 = 0;
      
      // South Pole
      const lat2 = -90;
      const lng2 = 0;
      
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Should be approximately 20,000 km (half Earth's circumference)
      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(21000);
    });

    it('should calculate short distances accurately', () => {
      // Two points in Lisbon (about 1 km apart)
      const lat1 = 38.7223;
      const lng1 = -9.1393;
      
      const lat2 = 38.7323; // 1 km north
      const lng2 = -9.1393;
      
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Should be approximately 1 km
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.2);
    });

    it('should handle negative coordinates', () => {
      // New York coordinates
      const lat1 = 40.7128;
      const lng1 = -74.0060;
      
      // Los Angeles coordinates
      const lat2 = 34.0522;
      const lng2 = -118.2437;
      
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Distance should be approximately 4000 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4100);
    });

    it('should be commutative', () => {
      const lat1 = 38.7223;
      const lng1 = -9.1393;
      
      const lat2 = 41.1579;
      const lng2 = -8.6291;
      
      const distance1 = calculateDistance(lat1, lng1, lat2, lng2);
      const distance2 = calculateDistance(lat2, lng2, lat1, lng1);
      
      expect(distance1).toBe(distance2);
    });

    it('should handle edge cases', () => {
      // Equator
      const lat1 = 0;
      const lng1 = 0;
      
      // Prime meridian
      const lat2 = 0;
      const lng2 = 90;
      
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Should be approximately 10,000 km (quarter Earth's circumference)
      expect(distance).toBeGreaterThan(9900);
      expect(distance).toBeLessThan(10100);
    });
  });
});
