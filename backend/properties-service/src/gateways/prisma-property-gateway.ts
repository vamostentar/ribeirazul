/**
 * Prisma Property Gateway Implementation
 * 
 * Implements PropertyDataGateway interface using Prisma ORM
 * All Prisma-specific logic is isolated here
 */

import { Prisma, PrismaClient, Property } from '@prisma/client';
import {
    PaginatedPropertyData,
    PaginationData,
    PropertyCoordinates,
    PropertyCreateData,
    PropertyData,
    PropertyFilterData,
    PropertyId,
    PropertyStats,
    PropertyStatus,
    PropertyType,
    PropertyUpdateData,
    PropertyWithComputedFields
} from '../domain/property-types';
import { GatewayConfig, PropertyDataGateway, PropertyDataGatewayFactory } from './property-data-gateway';

/**
 * Transforms Prisma Property to Domain PropertyData
 */
function transformFromPrisma(property: Property): PropertyData {
  // Safe parsing of coordinates from Prisma JSON field
  let coordinates: PropertyCoordinates | null = null;
  if (property.coordinates) {
    try {
      const coordsData = typeof property.coordinates === 'string' 
        ? JSON.parse(property.coordinates)
        : property.coordinates;
      
      if (coordsData && typeof coordsData === 'object' && 'latitude' in coordsData && 'longitude' in coordsData) {
        coordinates = {
          latitude: Number(coordsData.latitude),
          longitude: Number(coordsData.longitude)
        };
      }
    } catch {
      coordinates = null;
    }
  }

  return {
    id: property.id,
    title: property.title,
    location: property.location,
    price: Number(property.price),
    status: property.status as PropertyStatus,
    type: property.type as PropertyType | null,
    imageUrl: property.imageUrl,
    description: property.description,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area ? Number(property.area) : null,
    yearBuilt: property.yearBuilt,
    coordinates,
    features: property.features as string[] | null,
    contactPhone: property.contactPhone,
    contactEmail: property.contactEmail,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
  };
}

/**
 * Adds computed fields to PropertyData
 */
function addComputedFields(property: PropertyData): PropertyWithComputedFields {
  const currentYear = new Date().getFullYear();
  
  const pricePerSqm = property.price && property.area 
    ? property.price / property.area
    : null;
    
  const propertyAge = property.yearBuilt 
    ? currentYear - property.yearBuilt 
    : null;

  return {
    ...property,
    pricePerSqm,
    propertyAge,
  };
}

/**
 * Transforms Domain PropertyCreateData to Prisma format
 */
function transformToPrismaCreate(data: PropertyCreateData): any {
  return {
    title: data.title,
    location: data.location,
    price: new Prisma.Decimal(data.price),
    status: data.status,
    type: data.type,
    imageUrl: data.imageUrl,
    description: data.description,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    area: data.area ? new Prisma.Decimal(data.area) : null,
    yearBuilt: data.yearBuilt,
    coordinates: data.coordinates,
    features: data.features,
    contactPhone: data.contactPhone,
    contactEmail: data.contactEmail,
  };
}

/**
 * Transforms Domain PropertyUpdateData to Prisma format
 */
function transformToPrismaUpdate(data: PropertyUpdateData): any {
  const update: any = {};
  
  if (data.title !== undefined) update.title = data.title;
  if (data.location !== undefined) update.location = data.location;
  if (data.price !== undefined) update.price = new Prisma.Decimal(data.price);
  if (data.status !== undefined) update.status = data.status;
  if (data.type !== undefined) update.type = data.type;
  if (data.imageUrl !== undefined) update.imageUrl = data.imageUrl;
  if (data.description !== undefined) update.description = data.description;
  if (data.bedrooms !== undefined) update.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined) update.bathrooms = data.bathrooms;
  if (data.area !== undefined) update.area = data.area ? new Prisma.Decimal(data.area) : null;
  if (data.yearBuilt !== undefined) update.yearBuilt = data.yearBuilt;
  if (data.coordinates !== undefined) update.coordinates = data.coordinates;
  if (data.features !== undefined) update.features = data.features;
  if (data.contactPhone !== undefined) update.contactPhone = data.contactPhone;
  if (data.contactEmail !== undefined) update.contactEmail = data.contactEmail;
  
  return update;
}

/**
 * Builds Prisma where clause from domain filters
 */
function buildWhereClause(filters: PropertyFilterData): any {
  const where: any = {};

  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  
  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }
  
  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) where.price.gte = new Prisma.Decimal(filters.minPrice);
    if (filters.maxPrice) where.price.lte = new Prisma.Decimal(filters.maxPrice);
  }
  
  if (filters.minBedrooms || filters.maxBedrooms) {
    where.bedrooms = {};
    if (filters.minBedrooms) where.bedrooms.gte = filters.minBedrooms;
    if (filters.maxBedrooms) where.bedrooms.lte = filters.maxBedrooms;
  }
  
  if (filters.minBathrooms || filters.maxBathrooms) {
    where.bathrooms = {};
    if (filters.minBathrooms) where.bathrooms.gte = filters.minBathrooms;
    if (filters.maxBathrooms) where.bathrooms.lte = filters.maxBathrooms;
  }
  
  if (filters.minArea || filters.maxArea) {
    where.area = {};
    if (filters.minArea) where.area.gte = new Prisma.Decimal(filters.minArea);
    if (filters.maxArea) where.area.lte = new Prisma.Decimal(filters.maxArea);
  }
  
  if (filters.minYearBuilt || filters.maxYearBuilt) {
    where.yearBuilt = {};
    if (filters.minYearBuilt) where.yearBuilt.gte = filters.minYearBuilt;
    if (filters.maxYearBuilt) where.yearBuilt.lte = filters.maxYearBuilt;
  }
  
  if (filters.features && filters.features.length > 0) {
    where.features = { hasSome: filters.features };
  }
  
  if (filters.textQuery) {
    where.OR = [
      { title: { contains: filters.textQuery, mode: 'insensitive' } },
      { description: { contains: filters.textQuery, mode: 'insensitive' } },
      { location: { contains: filters.textQuery, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Builds Prisma orderBy clause from domain sort criteria
 */
function buildOrderByClause(sortBy: string = 'createdAt', sortOrder: string = 'desc'): any {
  const orderBy: any = {};
  
  switch (sortBy) {
    case 'price':
      orderBy.price = sortOrder;
      break;
    case 'area':
      orderBy.area = sortOrder;
      break;
    case 'title':
      orderBy.title = sortOrder;
      break;
    default:
      orderBy.createdAt = sortOrder;
  }
  
  return orderBy;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Prisma implementation of PropertyDataGateway
 */
export class PrismaPropertyGateway implements PropertyDataGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: PropertyCreateData): Promise<PropertyData> {
    const prismaData = transformToPrismaCreate(data);
    const property = await this.prisma.property.create({
      data: prismaData,
    });
    
    return transformFromPrisma(property);
  }

  async findById(id: PropertyId): Promise<PropertyData | null> {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });
    
    return property ? transformFromPrisma(property) : null;
  }

  async findMany(filters: PropertyFilterData): Promise<PaginatedPropertyData> {
    const limit = filters.limit || 20;
    const limitPlusOne = limit + 1; // Fetch one extra to check if there are more results

    // Handle nearby search separately
    if (filters.nearbySearch) {
      return this.findNearbyProperties(filters, limit);
    }

    // Regular database query
    const where = buildWhereClause(filters);
    const orderBy = buildOrderByClause(filters.sortBy, filters.sortOrder);
    
    const properties = await this.prisma.property.findMany({
      where,
      orderBy,
      take: limitPlusOne,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    // Determine pagination
    let nextCursor: string | null = null;
    let hasMore = false;

    if (properties.length > limit) {
      const lastProperty = properties.pop(); // Remove extra item
      nextCursor = lastProperty?.id || null;
      hasMore = true;
    }

    // Transform to domain objects
    const domainProperties = properties.map(transformFromPrisma);
    const propertiesWithComputed = domainProperties.map(addComputedFields);

    // Get total estimate for first page
    let totalEstimate: number | undefined;
    if (!filters.cursor && propertiesWithComputed.length > 0) {
      try {
        totalEstimate = await this.prisma.property.count({ where });
      } catch {
        totalEstimate = undefined;
      }
    }

    const pagination: PaginationData = {
      nextCursor,
      hasMore,
      limit,
      totalEstimate,
    };

    return {
      properties: propertiesWithComputed,
      pagination,
    };
  }

  async update(id: PropertyId, data: PropertyUpdateData): Promise<PropertyData> {
    const prismaData = transformToPrismaUpdate(data);
    const property = await this.prisma.property.update({
      where: { id },
      data: prismaData,
    });
    
    return transformFromPrisma(property);
  }

  async delete(id: PropertyId): Promise<void> {
    await this.prisma.property.delete({
      where: { id },
    });
  }

  async count(filters?: PropertyFilterData): Promise<number> {
    const where = filters ? buildWhereClause(filters) : {};
    return await this.prisma.property.count({ where });
  }

  async getStats(): Promise<PropertyStats> {
    const [
      total,
      forSaleCount,
      forRentCount,
      soldCount,
    ] = await Promise.all([
      this.prisma.property.count(),
      this.prisma.property.count({ where: { status: 'for_sale' } }),
      this.prisma.property.count({ where: { status: 'for_rent' } }),
      this.prisma.property.count({ where: { status: 'sold' } }),
    ]);

    // Get recent properties for price statistics (limit to avoid performance issues)
    const recentProperties = await this.prisma.property.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
      select: { price: true },
    });

    const prices = recentProperties.map(p => Number(p.price));
    let avgPrice = 0;
    let medianPrice = 0;
    let minPrice = 0;
    let maxPrice = 0;

    if (prices.length > 0) {
      avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      const sortedPrices = [...prices].sort((a, b) => a - b);
      medianPrice = sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
        : sortedPrices[Math.floor(sortedPrices.length / 2)];
        
      minPrice = sortedPrices[0];
      maxPrice = sortedPrices[sortedPrices.length - 1];
    }

    return {
      total,
      byStatus: {
        forSale: forSaleCount,
        forRent: forRentCount,
        sold: soldCount,
      },
      pricing: {
        average: Math.round(avgPrice),
        median: Math.round(medianPrice),
        min: minPrice,
        max: maxPrice,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handle nearby search with distance calculation
   */
  private async findNearbyProperties(filters: PropertyFilterData, limit: number): Promise<PaginatedPropertyData> {
    if (!filters.nearbySearch) {
      throw new Error('Nearby search parameters are required');
    }

    const { latitude, longitude, radiusKm } = filters.nearbySearch;
    
    // Get all properties with coordinates (in production, you might want to add a bounding box query first)
    const propertiesWithCoords = await this.prisma.property.findMany({
      where: {
        coordinates: { not: null },
        ...buildWhereClause({ ...filters, nearbySearch: undefined }), // Exclude nearbySearch from where clause
      },
      take: limit * 3, // Take more to filter by distance
    });

    // Calculate distances and filter
    const propertiesWithDistance = propertiesWithCoords
      .map((property) => {
        const domainProperty = transformFromPrisma(property);
        if (!domainProperty.coordinates) return null;
        
        const distance = calculateDistance(
          latitude,
          longitude,
          domainProperty.coordinates.latitude,
          domainProperty.coordinates.longitude
        );
        
        return distance <= radiusKm ? addComputedFields(domainProperty) : null;
      })
      .filter(Boolean) as PropertyWithComputedFields[];

    // Sort by distance and apply limit
    const sortedByDistance = propertiesWithDistance
      .sort((a, b) => {
        if (!a.coordinates || !b.coordinates) return 0;
        const distanceA = calculateDistance(latitude, longitude, a.coordinates.latitude, a.coordinates.longitude);
        const distanceB = calculateDistance(latitude, longitude, b.coordinates.latitude, b.coordinates.longitude);
        return distanceA - distanceB;
      })
      .slice(0, limit);

    const pagination: PaginationData = {
      nextCursor: null, // Nearby search doesn't support cursor pagination
      hasMore: propertiesWithDistance.length > limit,
      limit,
    };

    return {
      properties: sortedByDistance,
      pagination,
    };
  }
}

/**
 * Prisma Gateway Factory
 */
export class PrismaPropertyGatewayFactory implements PropertyDataGatewayFactory {
  constructor(private readonly prisma: PrismaClient) {}

  create(): PropertyDataGateway {
    return new PrismaPropertyGateway(this.prisma);
  }
}

/**
 * Factory creation function for Prisma
 */
export function createPrismaGatewayFactory(config: GatewayConfig): PropertyDataGatewayFactory {
  // In config, we can pass Prisma client or database URL
  const prisma = config.prisma as PrismaClient || new PrismaClient();
  return new PrismaPropertyGatewayFactory(prisma);
}