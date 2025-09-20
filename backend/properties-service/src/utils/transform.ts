import { Property } from '@prisma/client';
import { PropertyResponse } from '../types/property';

// Extended Property type that includes adminStatus
type PropertyWithAdminStatus = Property;

// Helper to convert Prisma Decimal to number and add computed fields
export function transformPropertyFromDb(property: PropertyWithAdminStatus): PropertyResponse {
  const currentYear = new Date().getFullYear();
  
  // Debug log para verificar o adminStatus
  console.log('🔍 Transformando propriedade:', {
    id: property.id,
    adminStatus: property.adminStatus,
    adminStatusType: typeof property.adminStatus,
    adminStatusIsNull: property.adminStatus === null,
    adminStatusIsUndefined: property.adminStatus === undefined,
    stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
  });
  
  // Safe parsing of coordinates from JSON
  let coordinates: { latitude: number; longitude: number } | null = null;
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
    } catch (error) {
      // Invalid coordinates, ignore
      coordinates = null;
    }
  }
  
  return {
    id: property.id,
    title: property.title,
    location: property.location,
    price: Number(property.price),
    status: property.status,
    adminStatus: property.adminStatus || 'ACTIVE',
    type: property.type,
    imageUrl: property.imageUrl,
    description: property.description,
    bedrooms: property.bedrooms || null,
    bathrooms: property.bathrooms || null,
    area: property.area ? Number(property.area) : null,
    yearBuilt: property.yearBuilt || null,
    coordinates,
    features: property.features || null,
    contactPhone: property.contactPhone || null,
    contactEmail: property.contactEmail || null,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    
    // Computed fields
    pricePerSqm: property.price && property.area 
      ? Number(property.price) / Number(property.area)
      : null,
    propertyAge: property.yearBuilt 
      ? currentYear - property.yearBuilt 
      : null,
  };
}

// Helper to format price for display
export function formatPrice(price: number, currency: string = '€'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency === '€' ? 'EUR' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// Helper to format area
export function formatArea(area: number): string {
  return `${area.toLocaleString('pt-PT')} m²`;
}

// Helper to calculate distance between two points (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

// Helper to generate property slug for URLs
export function generatePropertySlug(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove multiple consecutive hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
  return `${slug}-${id.slice(-8)}`;
}

// Helper to extract search terms
export function extractSearchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2)
    .slice(0, 10); // Limit to 10 terms
}

// Helper to format property status for display
export function formatPropertyStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'for_sale': 'À Venda',
    'for_rent': 'Para Arrendar',
    'sold': 'Vendido',
  };
  
  return statusMap[status] || status;
}

// Helper to format property type for display
export function formatPropertyType(type: string): string {
  const typeMap: Record<string, string> = {
    'apartamento': 'Apartamento',
    'moradia': 'Moradia',
    'loft': 'Loft',
    'penthouse': 'Penthouse',
    'estudio': 'Estúdio',
    'escritorio': 'Escritório',
    'terreno': 'Terreno',
  };
  
  return typeMap[type] || type;
}
