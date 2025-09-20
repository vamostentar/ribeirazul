import { PropertyStatus, PropertyType } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config/index';
import { paginationSchema, positiveNumberSchema, urlSchema } from './common';

// Enums validation
export const PropertyStatusSchema = z.nativeEnum(PropertyStatus);
export const PropertyTypeSchema = z.nativeEnum(PropertyType);
export const AdminStatusSchema = z.enum(['ACTIVE', 'PENDING', 'INACTIVE']);

// Property creation schema
export const propertyCreateSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(config.MAX_PROPERTY_TITLE_LENGTH, `Title must not exceed ${config.MAX_PROPERTY_TITLE_LENGTH} characters`)
    .trim(),
  
  location: z
    .string()
    .min(5, 'Location must be at least 5 characters')
    .max(500, 'Location must not exceed 500 characters')
    .trim(),
  
  price: z
    .number()
    .positive('Price must be positive')
    .max(config.MAX_PRICE, `Price must not exceed ${config.MAX_PRICE}`),
  
  status: PropertyStatusSchema.default(PropertyStatus.for_sale),
  
  adminStatus: AdminStatusSchema.optional(),
  
  type: PropertyTypeSchema.optional(),
  
  imageUrl: urlSchema.optional(),
  
  description: z
    .string()
    .max(config.MAX_PROPERTY_DESCRIPTION_LENGTH, `Description must not exceed ${config.MAX_PROPERTY_DESCRIPTION_LENGTH} characters`)
    .trim()
    .optional(),
  
  // New fields for better real estate functionality
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  area: z.number().positive().max(50000).optional(), // m²
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  
  // Geolocation
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional(),
  
  // Features
  features: z.array(z.string()).max(20).optional(),
  
  // Contact info
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

// Property update schema (all fields optional)
export const propertyUpdateSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(config.MAX_PROPERTY_TITLE_LENGTH, `Title must not exceed ${config.MAX_PROPERTY_TITLE_LENGTH} characters`)
    .trim()
    .optional(),

  location: z
    .string()
    .min(5, 'Location must be at least 5 characters')
    .max(500, 'Location must not exceed 500 characters')
    .trim()
    .optional(),

  price: z
    .number()
    .positive('Price must be positive')
    .max(config.MAX_PRICE, `Price must not exceed ${config.MAX_PRICE}`)
    .optional(),

  status: PropertyStatusSchema.optional(),

  adminStatus: AdminStatusSchema.optional(),

  type: PropertyTypeSchema.optional(),

  imageUrl: urlSchema.optional(),

  description: z
    .string()
    .max(config.MAX_PROPERTY_DESCRIPTION_LENGTH, `Description must not exceed ${config.MAX_PROPERTY_DESCRIPTION_LENGTH} characters`)
    .trim()
    .optional(),

  // New fields for better real estate functionality
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  area: z.number().positive().max(50000).optional(), // m²
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),

  // Geolocation
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional(),

  // Features
  features: z.array(z.string()).max(20).optional(),

  // Contact info
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

// Property filters schema
export const propertyFiltersSchema = z.object({
  status: PropertyStatusSchema.optional(),
  type: PropertyTypeSchema.optional(),
  
  // Price range
  minPrice: positiveNumberSchema.optional(),
  maxPrice: positiveNumberSchema.optional(),
  
  // Location search
  location: z.string().optional(),
  
  // Text search
  q: z.string().optional(),
  
  // Property characteristics
  minBedrooms: z.coerce.number().int().min(0).optional(),
  maxBedrooms: z.coerce.number().int().max(20).optional(),
  minBathrooms: z.coerce.number().int().min(0).optional(),
  maxBathrooms: z.coerce.number().int().max(20).optional(),
  
  // Area range
  minArea: positiveNumberSchema.optional(),
  maxArea: positiveNumberSchema.optional(),
  
  // Year built range
  minYearBuilt: z.coerce.number().int().min(1800).optional(),
  maxYearBuilt: z.coerce.number().int().max(new Date().getFullYear()).optional(),
  
  // Features
  features: z.array(z.string()).optional(),
  
  // Geospatial search
  nearbySearch: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radiusKm: z.number().positive().max(100).default(5)
  }).optional(),
  
  // Sorting
  sortBy: z.enum(['createdAt', 'price', 'area', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
}).merge(paginationSchema);

// Property response schema
export const propertyResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  location: z.string(),
  price: z.number(),
  status: PropertyStatusSchema,
  adminStatus: AdminStatusSchema,
  type: PropertyTypeSchema.nullable(),
  imageUrl: z.string().nullable(),
  description: z.string().nullable(),
  bedrooms: z.number().int().nullable(),
  bathrooms: z.number().int().nullable(),
  area: z.number().nullable(),
  yearBuilt: z.number().int().nullable(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).nullable(),
  features: z.array(z.string()).nullable(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  
  // Computed fields
  pricePerSqm: z.number().nullable(),
  propertyAge: z.number().int().nullable(),
});

// TypeScript types
export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type PropertyFilters = z.infer<typeof propertyFiltersSchema>;
export type PropertyResponse = z.infer<typeof propertyResponseSchema>;

// Repository types
export interface PropertyRepository {
  create(data: PropertyCreateInput): Promise<PropertyResponse>;
  findById(id: string): Promise<PropertyResponse | null>;
  findMany(filters: PropertyFilters): Promise<PropertyResponse[]>;
  update(id: string, data: PropertyUpdateInput): Promise<PropertyResponse>;
  delete(id: string): Promise<void>;
  count(filters?: Partial<PropertyFilters>): Promise<number>;
}

// Service types
export interface PropertyService {
  createProperty(data: PropertyCreateInput): Promise<PropertyResponse>;
  getPropertyById(id: string): Promise<PropertyResponse>;
  getProperties(filters: Partial<PropertyFilters> & { limit: number; sortBy: string; sortOrder: string }): Promise<{ data: PropertyResponse[]; pagination: any }>;
  updateProperty(id: string, data: PropertyUpdateInput): Promise<PropertyResponse>;
  deleteProperty(id: string): Promise<void>;
  getPropertiesStats(): Promise<any>;
}
