import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../types/common';
import { PropertyCreateInput, PropertyFilters, PropertyRepository, PropertyResponse, PropertyUpdateInput } from '../types/property';
import { repositoryLogger } from '../utils/logger';
import { calculateDistance, transformPropertyFromDb } from '../utils/transform';

export class PropertyRepositoryImpl implements PropertyRepository {
  async create(data: PropertyCreateInput): Promise<PropertyResponse> {
    const startTime = Date.now();
    
    try {
      const property = await prisma.property.create({
        data: {
          title: data.title,
          location: data.location,
          price: new Prisma.Decimal(data.price),
          status: data.status,
          adminStatus: data.adminStatus,
          type: data.type,
          imageUrl: data.imageUrl,
          description: data.description,
          // Extended fields (assuming schema will be updated)
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          area: data.area ? new Prisma.Decimal(data.area) : null,
          yearBuilt: data.yearBuilt,
          coordinates: data.coordinates,
          features: data.features,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
        } as any, // Type assertion due to extended fields
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
      const property = await prisma.property.findUnique({
        where: { id },
      });

      console.log('🔍 Propriedade encontrada no banco:', { id, adminStatus: (property as any)?.adminStatus });

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
      
      // Handle nearby search separately if coordinates provided
      if (filters.nearbySearch) {
        properties = await this.findNearby(filters);
      } else {
        properties = await prisma.property.findMany({
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
      // Check if property exists
      const exists = await prisma.property.findUnique({ where: { id } });
      if (!exists) {
        throw new NotFoundError('Property', id);
      }
      
      const updateData: any = {};
      
      // Only include fields that are provided
      if (data.title !== undefined) updateData.title = data.title;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.adminStatus !== undefined) {
        updateData.adminStatus = data.adminStatus;
        repositoryLogger.debug({ operation: 'update', field: 'adminStatus', value: data.adminStatus }, 'Updating adminStatus field');
      }
      if (data.type !== undefined) updateData.type = data.type;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.bedrooms !== undefined) updateData.bedrooms = data.bedrooms;
      if (data.bathrooms !== undefined) updateData.bathrooms = data.bathrooms;
      if (data.area !== undefined) updateData.area = data.area ? new Prisma.Decimal(data.area) : null;
      if (data.yearBuilt !== undefined) updateData.yearBuilt = data.yearBuilt;
      if (data.coordinates !== undefined) updateData.coordinates = data.coordinates;
      if (data.features !== undefined) updateData.features = data.features;
      if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
      if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
      
      const property = await prisma.property.update({
        where: { id },
        data: updateData,
      });
      
      const duration = Date.now() - startTime;
      repositoryLogger.debug({ operation: 'update', table: 'property', duration, id }, 'Property updated');
      
      // Debug log para verificar o adminStatus após update
      console.log('🔍 Propriedade após update no Prisma:', {
        id: property.id,
        adminStatus: property.adminStatus,
        adminStatusType: typeof property.adminStatus,
        rawProperty: JSON.stringify(property, null, 2)
      });
      
      // Verificar se o problema está na consulta imediatamente após o update
      const verifyProperty = await prisma.property.findUnique({
        where: { id }
      });
      
      console.log('🔍 Propriedade após verificação:', {
        id: verifyProperty?.id,
        adminStatus: verifyProperty?.adminStatus,
        adminStatusType: typeof verifyProperty?.adminStatus
      });
      
      return transformPropertyFromDb(property);
    } catch (error) {
      repositoryLogger.error({ error, operation: 'update', id, data }, 'Failed to update property');
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check if property exists
      const exists = await prisma.property.findUnique({ where: { id } });
      if (!exists) {
        throw new NotFoundError('Property', id);
      }
      
      await prisma.property.delete({
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
    const startTime = Date.now();
    
    try {
      const where = filters ? this.buildWhereClause(filters as PropertyFilters) : {};
      
      const count = await prisma.property.count({ where });
      
      const duration = Date.now() - startTime;
      repositoryLogger.debug({ operation: 'count', table: 'property', duration, count }, 'Property count completed');
      
      return count;
    } catch (error) {
      repositoryLogger.error({ error, operation: 'count', filters }, 'Failed to count properties');
      throw error;
    }
  }

  private buildWhereClause(filters: PropertyFilters): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {};
    
    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }
    
    // Type filter
    if (filters.type) {
      where.type = filters.type;
    }
    
    // Location filter (case-insensitive search)
    if (filters.location) {
      where.location = {
        contains: filters.location,
        mode: 'insensitive',
      };
    }
    
    // Price range
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        where.price.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice) {
        where.price.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }
    
    // Area range
    if (filters.minArea || filters.maxArea) {
      (where as any).area = {};
      if (filters.minArea) {
        (where as any).area.gte = new Prisma.Decimal(filters.minArea);
      }
      if (filters.maxArea) {
        (where as any).area.lte = new Prisma.Decimal(filters.maxArea);
      }
    }
    
    // Bedrooms range
    if (filters.minBedrooms !== undefined || filters.maxBedrooms !== undefined) {
      (where as any).bedrooms = {};
      if (filters.minBedrooms !== undefined) {
        (where as any).bedrooms.gte = filters.minBedrooms;
      }
      if (filters.maxBedrooms !== undefined) {
        (where as any).bedrooms.lte = filters.maxBedrooms;
      }
    }
    
    // Bathrooms range
    if (filters.minBathrooms !== undefined || filters.maxBathrooms !== undefined) {
      (where as any).bathrooms = {};
      if (filters.minBathrooms !== undefined) {
        (where as any).bathrooms.gte = filters.minBathrooms;
      }
      if (filters.maxBathrooms !== undefined) {
        (where as any).bathrooms.lte = filters.maxBathrooms;
      }
    }
    
    // Year built range
    if (filters.minYearBuilt || filters.maxYearBuilt) {
      (where as any).yearBuilt = {};
      if (filters.minYearBuilt) {
        (where as any).yearBuilt.gte = filters.minYearBuilt;
      }
      if (filters.maxYearBuilt) {
        (where as any).yearBuilt.lte = filters.maxYearBuilt;
      }
    }
    
    // Features filter
    if (filters.features && filters.features.length > 0) {
      (where as any).features = {
        hasEvery: filters.features,
      };
    }
    
    // Text search (searches in title, description, and location)
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
        { location: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    
    return where;
  }
  
  private buildOrderByClause(
    sortBy: PropertyFilters['sortBy'], 
    sortOrder: PropertyFilters['sortOrder']
  ): Prisma.PropertyOrderByWithRelationInput {
    const orderBy: Prisma.PropertyOrderByWithRelationInput = {};
    
    switch (sortBy) {
      case 'price':
        orderBy.price = sortOrder;
        break;
      case 'area':
        (orderBy as any).area = sortOrder;
        break;
      case 'title':
        orderBy.title = sortOrder;
        break;
      case 'createdAt':
      default:
        orderBy.createdAt = sortOrder;
        break;
    }
    
    return orderBy;
  }
  
  private async findNearby(filters: PropertyFilters): Promise<any[]> {
    if (!filters.nearbySearch) return [];
    
    const { latitude, longitude, radiusKm } = filters.nearbySearch;
    
    // Note: This is a simplified implementation. For production, you'd want to use PostGIS
    // or similar geospatial database extensions for better performance.
    const properties = await prisma.property.findMany({
      where: this.buildWhereClause(filters),
    });
    
    // Filter by distance and sort by proximity
    const nearby = properties
      .filter((property: any) => {
        if (!property.coordinates) return false;
        
        const distance = calculateDistance(
          latitude,
          longitude,
          property.coordinates.latitude,
          property.coordinates.longitude
        );
        
        return distance <= radiusKm;
      })
      .sort((a: any, b: any) => {
        const distanceA = calculateDistance(
          latitude,
          longitude,
          a.coordinates.latitude,
          a.coordinates.longitude
        );
        const distanceB = calculateDistance(
          latitude,
          longitude,
          b.coordinates.latitude,
          b.coordinates.longitude
        );
        
        return distanceA - distanceB;
      })
      .slice(0, filters.limit);
    
    return nearby;
  }
}

export const propertyRepository = new PropertyRepositoryImpl();
