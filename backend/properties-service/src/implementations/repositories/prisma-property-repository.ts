import { Prisma } from '@prisma/client';
import { IPropertyRepository } from '../../interfaces';
import { PropertyCreateInput, PropertyFilters, PropertyResponse, PropertyUpdateInput } from '../../types/property';
import { repositoryLogger } from '../../utils/logger';
import { calculateDistance, transformPropertyFromDb } from '../../utils/transform';

export class PrismaPropertyRepository implements IPropertyRepository {
  constructor(private prisma: any) {}

  async create(data: PropertyCreateInput): Promise<PropertyResponse> {
    const startTime = Date.now();
    
    try {
      repositoryLogger.debug({ adminStatus: (data as any).adminStatus }, 'PrismaPropertyRepository.create received adminStatus');
      const property = await this.prisma.property.create({
        data: {
          title: data.title,
          location: data.location,
          price: new Prisma.Decimal(data.price),
          status: data.status,
          adminStatus: data.adminStatus, 
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
        } as any,
      });
      
      const duration = Date.now() - startTime;
      repositoryLogger.debug({ operation: 'create', table: 'property', duration }, 'Property created');
      
      return transformPropertyFromDb(property);
    } catch (error) {
      repositoryLogger.error({ error, operation: 'create', data }, 'Failed to create property');
      throw error;
    }
  }

  async findById(id: string): Promise<PropertyResponse | null> {
    const startTime = Date.now();
    
    try {
      const property = await this.prisma.property.findUnique({
        where: { id },
      });
      
      const duration = Date.now() - startTime;
      repositoryLogger.debug({ operation: 'findById', table: 'property', duration, id }, 'Property lookup completed');
      
      return property ? transformPropertyFromDb(property) : null;
    } catch (error) {
      repositoryLogger.error({ error, operation: 'findById', id }, 'Failed to find property by ID');
      throw error;
    }
  }

  async findMany(filters: PropertyFilters): Promise<PropertyResponse[]> {
    const startTime = Date.now();
    
    try {
      const where = this.buildWhereClause(filters);
      const orderBy = this.buildOrderByClause(filters.sortBy, filters.sortOrder);
      
      let properties;
      
      if (filters.nearbySearch) {
        properties = await this.findNearby(filters);
      } else {
        properties = await this.prisma.property.findMany({
          where,
          orderBy,
          take: filters.limit,
          ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
        });
      }
      
      const duration = Date.now() - startTime;
      repositoryLogger.debug({ 
        operation: 'findMany', 
        table: 'property', 
        duration, 
        count: properties.length,
        filters 
      }, 'Properties search completed');
      
      return properties.map(transformPropertyFromDb);
    } catch (error) {
      repositoryLogger.error({ error, operation: 'findMany', filters }, 'Failed to find properties');
      throw error;
    }
  }

  async update(id: string, data: PropertyUpdateInput): Promise<PropertyResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🔧 PrismaPropertyRepository.update input:', { id, adminStatus: (data as any).adminStatus, fullData: data });
      repositoryLogger.debug({ id, adminStatus: (data as any).adminStatus }, 'PrismaPropertyRepository.update received adminStatus');
      
      // Create update object more explicitly
      const updateData: any = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.adminStatus !== undefined) updateData.adminStatus = data.adminStatus;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.bedrooms !== undefined) updateData.bedrooms = data.bedrooms;
      if (data.bathrooms !== undefined) updateData.bathrooms = data.bathrooms;
      if (data.area !== undefined) updateData.area = new Prisma.Decimal(data.area);
      if (data.yearBuilt !== undefined) updateData.yearBuilt = data.yearBuilt;
      if (data.coordinates !== undefined) updateData.coordinates = data.coordinates;
      if (data.features !== undefined) updateData.features = data.features;
      if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
      if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
      
      console.log('🔧 PrismaPropertyRepository.update updateData:', updateData);
      
      const property = await this.prisma.property.update({
        where: { id },
        data: updateData,
      });
      
      console.log('🔧 PrismaPropertyRepository.update result:', { id: property.id, adminStatus: property.adminStatus });
      
      const duration = Date.now() - startTime;
      repositoryLogger.debug({ operation: 'update', table: 'property', duration, id }, 'Property updated');
      
      return transformPropertyFromDb(property);
    } catch (error) {
      console.error('❌ PrismaPropertyRepository.update error:', error);
      repositoryLogger.error({ error, operation: 'update', id, data }, 'Failed to update property');
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.prisma.property.delete({
        where: { id },
      });
      
      const duration = Date.now() - startTime;
      repositoryLogger.debug({ operation: 'delete', table: 'property', duration, id }, 'Property deleted');
    } catch (error) {
      repositoryLogger.error({ error, operation: 'delete', id }, 'Failed to delete property');
      throw error;
    }
  }

  async count(filters?: Partial<PropertyFilters>): Promise<number> {
    try {
      const where = this.buildWhereClause(filters || {});
      return await this.prisma.property.count({ where });
    } catch (error) {
      repositoryLogger.error({ error, operation: 'count', filters }, 'Failed to count properties');
      throw error;
    }
  }

  async findNearby(filters: PropertyFilters): Promise<PropertyResponse[]> {
    if (!filters.nearbySearch) {
      throw new Error('Nearby search requires coordinates');
    }

    const { latitude, longitude, radiusKm } = filters.nearbySearch;
    
    // Get all properties with coordinates first
    const properties = await this.prisma.property.findMany({
      where: {
        coordinates: { not: null },
      },
      take: filters.limit,
    });

    // Filter by distance
    const nearbyProperties = properties
      .map((property: any) => ({
        ...property,
        distance: calculateDistance(
          latitude,
          longitude,
          property.coordinates.latitude,
          property.coordinates.longitude
        ),
      }))
      .filter((property: any) => property.distance <= radiusKm)
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, filters.limit);

    return nearbyProperties.map(transformPropertyFromDb);
  }

  private buildWhereClause(filters: Partial<PropertyFilters>) {
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
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
        { location: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderByClause(sortBy: string, sortOrder: string) {
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
}
