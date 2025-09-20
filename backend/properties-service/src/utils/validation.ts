import { ZodSchema } from 'zod';
import { ValidationError } from '../types/common';

export function validateInput<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errorDetails = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
    
    throw new ValidationError('Validation failed', errorDetails);
  }
  
  return result.data;
}

export function validateUUID(value: string, fieldName: string = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid UUID`);
  }
}

export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validatePriceRange(minPrice?: number, maxPrice?: number): void {
  if (minPrice && maxPrice && minPrice >= maxPrice) {
    throw new ValidationError('minPrice must be less than maxPrice');
  }
}

export function validateAreaRange(minArea?: number, maxArea?: number): void {
  if (minArea && maxArea && minArea >= maxArea) {
    throw new ValidationError('minArea must be less than maxArea');
  }
}

export function validateBedroomRange(minBedrooms?: number, maxBedrooms?: number): void {
  if (minBedrooms && maxBedrooms && minBedrooms > maxBedrooms) {
    throw new ValidationError('minBedrooms must be less than or equal to maxBedrooms');
  }
}

export function validateBathroomRange(minBathrooms?: number, maxBathrooms?: number): void {
  if (minBathrooms && maxBathrooms && minBathrooms > maxBathrooms) {
    throw new ValidationError('minBathrooms must be less than or equal to maxBathrooms');
  }
}

export function validateYearRange(minYear?: number, maxYear?: number): void {
  if (minYear && maxYear && minYear > maxYear) {
    throw new ValidationError('minYearBuilt must be less than or equal to maxYearBuilt');
  }
  
  const currentYear = new Date().getFullYear();
  if (minYear && minYear > currentYear) {
    throw new ValidationError('minYearBuilt cannot be in the future');
  }
  if (maxYear && maxYear > currentYear) {
    throw new ValidationError('maxYearBuilt cannot be in the future');
  }
}

export function validateCoordinates(latitude?: number, longitude?: number): void {
  if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
    throw new ValidationError('Latitude must be between -90 and 90');
  }
  
  if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
    throw new ValidationError('Longitude must be between -180 and 180');
  }
}
