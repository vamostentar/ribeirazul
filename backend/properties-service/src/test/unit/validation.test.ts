import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../../types/common';
import { propertyCreateSchema, propertyFiltersSchema } from '../../types/property';
import {
    sanitizeString,
    validateAreaRange,
    validateBathroomRange,
    validateBedroomRange,
    validateCoordinates,
    validateInput,
    validatePriceRange,
    validateUUID,
    validateYearRange,
} from '../../utils/validation';

describe('Validation Utils', () => {
  describe('validateInput', () => {
    it('should validate correct data successfully', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      const data = { name: 'John', age: 30 };
      const result = validateInput(schema, data);
      
      expect(result).toEqual(data);
    });

    it('should throw ValidationError for invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      const data = { name: 'John', age: 'invalid' };
      
      expect(() => validateInput(schema, data)).toThrow(ValidationError);
    });

    it('should provide detailed error information', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
      });
      
      const data = { name: 'Jo', age: 15 };
      
      try {
        validateInput(schema, data);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.details).toHaveLength(2);
          expect(error.details?.[0].field).toBe('name');
          expect(error.details?.[1].field).toBe('age');
        }
      }
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUIDs', () => {
      const validUUIDs = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Version 4 UUID
        '550e8400-e29b-41d4-a716-446655440000', // Version 4 UUID
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Version 4 UUID
      ];
      
      validUUIDs.forEach((uuid, index) => {
        try {
          validateUUID(uuid, 'testId');
        } catch (error) {
          console.log(`UUID ${index + 1} failed: ${uuid}`);
          throw error;
        }
        expect(() => validateUUID(uuid, 'testId')).not.toThrow();
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
        '',
        'null',
      ];
      
      invalidUUIDs.forEach(uuid => {
        expect(() => validateUUID(uuid)).toThrow(ValidationError);
      });
    });

    it('should use custom field name in error message', () => {
      try {
        validateUUID('invalid', 'propertyId');
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toContain('propertyId');
        }
      }
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
    });

    it('should normalize multiple spaces', () => {
      expect(sanitizeString('hello    world')).toBe('hello world');
      expect(sanitizeString('hello\n\tworld')).toBe('hello world');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });

  describe('validatePriceRange', () => {
    it('should validate correct price ranges', () => {
      expect(() => validatePriceRange(100000, 500000)).not.toThrow();
      expect(() => validatePriceRange(undefined, 500000)).not.toThrow();
      expect(() => validatePriceRange(100000, undefined)).not.toThrow();
      expect(() => validatePriceRange(undefined, undefined)).not.toThrow();
    });

    it('should reject invalid price ranges', () => {
      expect(() => validatePriceRange(500000, 100000)).toThrow(ValidationError);
      expect(() => validatePriceRange(500000, 500000)).toThrow(ValidationError);
    });

    it('should provide clear error message', () => {
      try {
        validatePriceRange(500000, 100000);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toContain('minPrice must be less than maxPrice');
        }
      }
    });
  });

  describe('validateAreaRange', () => {
    it('should validate correct area ranges', () => {
      expect(() => validateAreaRange(50, 200)).not.toThrow();
      expect(() => validateAreaRange(undefined, 200)).not.toThrow();
      expect(() => validateAreaRange(50, undefined)).not.toThrow();
    });

    it('should reject invalid area ranges', () => {
      expect(() => validateAreaRange(200, 50)).toThrow(ValidationError);
      expect(() => validateAreaRange(200, 200)).toThrow(ValidationError);
    });
  });

  describe('validateBedroomRange', () => {
    it('should validate correct bedroom ranges', () => {
      expect(() => validateBedroomRange(1, 3)).not.toThrow();
      expect(() => validateBedroomRange(3, 3)).not.toThrow(); // Equal is valid
      expect(() => validateBedroomRange(undefined, 3)).not.toThrow();
      expect(() => validateBedroomRange(1, undefined)).not.toThrow();
    });

    it('should reject invalid bedroom ranges', () => {
      expect(() => validateBedroomRange(3, 1)).toThrow(ValidationError);
    });
  });

  describe('validateBathroomRange', () => {
    it('should validate correct bathroom ranges', () => {
      expect(() => validateBathroomRange(1, 2)).not.toThrow();
      expect(() => validateBathroomRange(2, 2)).not.toThrow(); // Equal is valid
      expect(() => validateBathroomRange(undefined, 2)).not.toThrow();
      expect(() => validateBathroomRange(1, undefined)).not.toThrow();
    });

    it('should reject invalid bathroom ranges', () => {
      expect(() => validateBathroomRange(2, 1)).toThrow(ValidationError);
    });
  });

  describe('validateYearRange', () => {
    const currentYear = new Date().getFullYear();
    
    it('should validate correct year ranges', () => {
      expect(() => validateYearRange(1990, 2020)).not.toThrow();
      expect(() => validateYearRange(2020, 2020)).not.toThrow(); // Equal is valid
      expect(() => validateYearRange(undefined, 2020)).not.toThrow();
      expect(() => validateYearRange(1990, undefined)).not.toThrow();
    });

    it('should reject invalid year ranges', () => {
      expect(() => validateYearRange(2020, 1990)).toThrow(ValidationError);
    });

    it('should reject future years', () => {
      expect(() => validateYearRange(currentYear + 1, currentYear + 5)).toThrow(ValidationError);
      expect(() => validateYearRange(currentYear, currentYear + 1)).toThrow(ValidationError);
    });

    it('should accept current year', () => {
      expect(() => validateYearRange(currentYear, currentYear)).not.toThrow();
      expect(() => validateYearRange(1990, currentYear)).not.toThrow();
    });
  });

  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(() => validateCoordinates(0, 0)).not.toThrow();
      expect(() => validateCoordinates(90, 180)).not.toThrow();
      expect(() => validateCoordinates(-90, -180)).not.toThrow();
      expect(() => validateCoordinates(38.7223, -9.1393)).not.toThrow(); // Lisbon
      expect(() => validateCoordinates(40.7128, -74.0060)).not.toThrow(); // New York
    });

    it('should reject invalid latitude', () => {
      expect(() => validateCoordinates(91, 0)).toThrow(ValidationError);
      expect(() => validateCoordinates(-91, 0)).toThrow(ValidationError);
      expect(() => validateCoordinates(100, 0)).toThrow(ValidationError);
      expect(() => validateCoordinates(-100, 0)).toThrow(ValidationError);
    });

    it('should reject invalid longitude', () => {
      expect(() => validateCoordinates(0, 181)).toThrow(ValidationError);
      expect(() => validateCoordinates(0, -181)).toThrow(ValidationError);
      expect(() => validateCoordinates(0, 200)).toThrow(ValidationError);
      expect(() => validateCoordinates(0, -200)).toThrow(ValidationError);
    });

    it('should handle undefined values', () => {
      expect(() => validateCoordinates(undefined, 0)).not.toThrow();
      expect(() => validateCoordinates(0, undefined)).not.toThrow();
      expect(() => validateCoordinates(undefined, undefined)).not.toThrow();
    });
  });
});

describe('Property Schema Validation', () => {
  describe('propertyCreateSchema', () => {
    it('should validate correct property data', () => {
      const validProperty = {
        title: 'Beautiful Apartment in Lisbon',
        location: 'Chiado, Lisbon, Portugal',
        price: 450000,
        status: 'for_sale' as const,
        type: 'apartamento' as const,
        description: 'A stunning apartment with city views',
        bedrooms: 2,
        bathrooms: 2,
        area: 85,
        yearBuilt: 2015,
        coordinates: {
          latitude: 38.7223,
          longitude: -9.1393,
        },
        features: ['ELEVATOR', 'BALCONY', 'AIR_CONDITIONING'],
        contactPhone: '+351912345678',
        contactEmail: 'agent@lisbonproperties.pt',
      };
      
      const result = validateInput(propertyCreateSchema, validProperty);
      expect(result).toEqual(validProperty);
    });

    it('should reject property with invalid title length', () => {
      const invalidProperty = {
        title: 'A'.repeat(201), // Exceeds MAX_PROPERTY_TITLE_LENGTH
        location: 'Lisbon',
        price: 450000,
      };
      
      expect(() => validateInput(propertyCreateSchema, invalidProperty)).toThrow(ValidationError);
    });

    it('should reject property with invalid price', () => {
      const invalidProperty = {
        title: 'Beautiful Apartment',
        location: 'Lisbon',
        price: -1000, // Negative price
      };
      
      expect(() => validateInput(propertyCreateSchema, invalidProperty)).toThrow(ValidationError);
    });

    it('should reject property with invalid coordinates', () => {
      const invalidProperty = {
        title: 'Beautiful Apartment',
        location: 'Lisbon',
        price: 450000,
        coordinates: {
          latitude: 100, // Invalid latitude
          longitude: -9.1393,
        },
      };
      
      expect(() => validateInput(propertyCreateSchema, invalidProperty)).toThrow(ValidationError);
    });

    it('should reject property with too many features', () => {
      const invalidProperty = {
        title: 'Beautiful Apartment',
        location: 'Lisbon',
        price: 450000,
        features: Array(21).fill('FEATURE'), // Exceeds max 20 features
      };
      
      expect(() => validateInput(propertyCreateSchema, invalidProperty)).toThrow(ValidationError);
    });
  });

  describe('propertyFiltersSchema', () => {
    it('should validate correct filter data', () => {
      const validFilters = {
        status: 'for_sale' as const,
        minPrice: 200000,
        maxPrice: 500000,
        minBedrooms: 2,
        maxBedrooms: 3,
        location: 'Lisbon',
        limit: 25,
        sortBy: 'price' as const,
        sortOrder: 'asc' as const,
      };
      
      const result = validateInput(propertyFiltersSchema, validFilters);
      expect(result).toEqual(validFilters);
    });

    it('should set default values correctly', () => {
      const minimalFilters = {
        limit: 10,
      };
      
      const result = validateInput(propertyFiltersSchema, minimalFilters);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should validate nearby search parameters', () => {
      const validFilters = {
        nearbySearch: {
          latitude: 38.7223,
          longitude: -9.1393,
          radiusKm: 10,
        },
        limit: 20,
      };
      
      const result = validateInput(propertyFiltersSchema, validFilters);
      expect(result.nearbySearch?.radiusKm).toBe(10);
    });
  });
});
