/**
 * Properties API - HTTP Interface Layer
 * 
 * Clean HTTP interface that the API Gateway uses
 * Following Eskil Steenberg's principle: "Interfaces should be stable and minimal"
 * 
 * Zero business logic - just HTTP handling and input/output transformation
 */

import { PropertyCore, PropertyNotFoundError, PropertyValidationError } from '../core/property-core';
import {
    PaginatedPropertyData,
    PropertyCreateData,
    PropertyFilterData,
    PropertyId,
    PropertyStats,
    PropertyUpdateData,
    PropertyWithComputedFields
} from '../domain/property-types';

/**
 * Standard API Response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    field?: string;
  };
  timestamp: string;
}

/**
 * Properties API Interface
 * This is what external systems (API Gateway) interact with
 */
export interface PropertiesAPI {
  createProperty(data: PropertyCreateData): Promise<ApiResponse<PropertyWithComputedFields>>;
  getProperty(id: PropertyId): Promise<ApiResponse<PropertyWithComputedFields>>;
  searchProperties(filters: PropertyFilterData): Promise<ApiResponse<PaginatedPropertyData>>;
  updateProperty(id: PropertyId, data: PropertyUpdateData): Promise<ApiResponse<PropertyWithComputedFields>>;
  deleteProperty(id: PropertyId): Promise<ApiResponse<void>>;
  getStats(): Promise<ApiResponse<PropertyStats>>;
  searchByText(query: string, limit?: number): Promise<ApiResponse<PropertyWithComputedFields[]>>;
  findNearby(lat: number, lng: number, radius?: number, limit?: number): Promise<ApiResponse<PropertyWithComputedFields[]>>;
  healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>>;
}

/**
 * HTTP status codes for different error types
 */
const ERROR_HTTP_CODES: Record<string, number> = {
  PropertyValidationError: 400,
  PropertyNotFoundError: 404,
  DatabaseError: 503,
  default: 500,
};

/**
 * Implementation of PropertiesAPI using PropertyCore
 */
export class PropertiesAPIImpl implements PropertiesAPI {
  constructor(private readonly core: PropertyCore) {}

  async createProperty(data: PropertyCreateData): Promise<ApiResponse<PropertyWithComputedFields>> {
    try {
      const property = await this.core.createProperty(data);
      return this.successResponse(property);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  async getProperty(id: PropertyId): Promise<ApiResponse<PropertyWithComputedFields>> {
    try {
      const property = await this.core.getProperty(id);
      return this.successResponse(property);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  async searchProperties(filters: PropertyFilterData): Promise<ApiResponse<PaginatedPropertyData>> {
    try {
      const result = await this.core.searchProperties(filters);
      return this.successResponse(result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  async updateProperty(id: PropertyId, data: PropertyUpdateData): Promise<ApiResponse<PropertyWithComputedFields>> {
    try {
      const property = await this.core.updateProperty(id, data);
      return this.successResponse(property);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  async deleteProperty(id: PropertyId): Promise<ApiResponse<void>> {
    try {
      await this.core.deleteProperty(id);
      return this.successResponse(undefined);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  async getStats(): Promise<ApiResponse<PropertyStats>> {
    try {
      const stats = await this.core.getStats();
      return this.successResponse(stats);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  async searchByText(query: string, limit?: number): Promise<ApiResponse<PropertyWithComputedFields[]>> {
    try {
      const properties = await this.core.searchByText(query, limit);
      return this.successResponse(properties);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  async findNearby(
    lat: number, 
    lng: number, 
    radius?: number, 
    limit?: number
  ): Promise<ApiResponse<PropertyWithComputedFields[]>> {
    try {
      const properties = await this.core.findNearbyProperties(lat, lng, radius, limit);
      return this.successResponse(properties);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const isHealthy = await this.core.isHealthy();
      const status = isHealthy ? 'healthy' : 'unhealthy';
      return this.successResponse({ status, timestamp: new Date().toISOString() });
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private successResponse<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  private errorResponse(error: unknown): ApiResponse<never> {
    const timestamp = new Date().toISOString();

    // Handle known business errors
    if (error instanceof PropertyValidationError) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR',
          field: error.field,
        },
        timestamp,
      };
    }

    if (error instanceof PropertyNotFoundError) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
        timestamp,
      };
    }

    // Handle database/gateway errors
    if (error instanceof Error) {
      // Don't expose internal error details in production
      const message = process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error';

      return {
        success: false,
        error: {
          message,
          code: 'INTERNAL_ERROR',
        },
        timestamp,
      };
    }

    // Unknown error
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      },
      timestamp,
    };
  }
}

/**
 * Get HTTP status code for error type
 * Used by HTTP frameworks to set appropriate status codes
 */
export function getHttpStatusCode(error: unknown): number {
  if (error instanceof PropertyValidationError) return 400;
  if (error instanceof PropertyNotFoundError) return 404;
  return 500;
}

/**
 * Factory function to create PropertiesAPI
 */
export function createPropertiesAPI(core: PropertyCore): PropertiesAPI {
  return new PropertiesAPIImpl(core);
}

/**
 * Input validation helpers for HTTP layer
 * These can be used by different HTTP frameworks (Fastify, Express, etc.)
 */
export class APIInputValidator {
  static validatePropertyId(id: any): string {
    if (typeof id !== 'string') {
      throw new PropertyValidationError('Property ID must be a string', 'id');
    }
    return id;
  }

  static validateLimit(limit: any): number {
    if (limit === undefined || limit === null) return 20;
    
    const parsed = parseInt(String(limit), 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      throw new PropertyValidationError('Limit must be between 1 and 100', 'limit');
    }
    return parsed;
  }

  static validateCoordinate(value: any, name: string): number {
    const parsed = parseFloat(String(value));
    if (isNaN(parsed)) {
      throw new PropertyValidationError(`${name} must be a valid number`, name);
    }
    return parsed;
  }

  static validateRadius(radius: any): number {
    if (radius === undefined || radius === null) return 5;
    
    const parsed = parseFloat(String(radius));
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
      throw new PropertyValidationError('Radius must be between 0 and 100 km', 'radius');
    }
    return parsed;
  }

  static normalizeSearchQuery(query: any): string {
    if (typeof query !== 'string') {
      throw new PropertyValidationError('Query must be a string', 'query');
    }
    return query.trim();
  }
}