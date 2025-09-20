/**
 * Domain Types - Pure business logic types
 * Independent of any external dependencies (Prisma, database, etc.)
 * 
 * Following Eskil Steenberg's principle: "Primitives should be stable"
 */

export type PropertyId = string;
export type PropertyPrice = number;
export type PropertyArea = number;

// Core property status - business domain
export type PropertyStatus = 'for_sale' | 'for_rent' | 'sold';

// Core property types - real estate domain 
export type PropertyType = 
  | 'apartamento' 
  | 'moradia' 
  | 'loft' 
  | 'penthouse' 
  | 'estudio' 
  | 'escritorio' 
  | 'terreno';

// Location coordinates
export interface PropertyCoordinates {
  latitude: number;
  longitude: number;
}

// Core property data - what defines a property in our domain
export interface PropertyData {
  id: PropertyId;
  title: string;
  location: string;
  price: PropertyPrice;
  status: PropertyStatus;
  type: PropertyType | null;
  imageUrl: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: PropertyArea | null;
  yearBuilt: number | null;
  coordinates: PropertyCoordinates | null;
  features: string[] | null;
  contactPhone: string | null;
  contactEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Property creation data - what we need to create a property
export interface PropertyCreateData {
  title: string;
  location: string;
  price: PropertyPrice;
  status: PropertyStatus;
  type?: PropertyType;
  imageUrl?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: PropertyArea;
  yearBuilt?: number;
  coordinates?: PropertyCoordinates;
  features?: string[];
  contactPhone?: string;
  contactEmail?: string;
}

// Property update data - partial updates
export interface PropertyUpdateData {
  title?: string;
  location?: string;
  price?: PropertyPrice;
  status?: PropertyStatus;
  type?: PropertyType;
  imageUrl?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: PropertyArea;
  yearBuilt?: number;
  coordinates?: PropertyCoordinates;
  features?: string[];
  contactPhone?: string;
  contactEmail?: string;
}

// Search and filter criteria
export interface PropertyFilterData {
  // Status and type
  status?: PropertyStatus;
  type?: PropertyType;
  
  // Price range
  minPrice?: PropertyPrice;
  maxPrice?: PropertyPrice;
  
  // Location and text search
  location?: string;
  textQuery?: string;
  
  // Property characteristics
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  
  // Area range
  minArea?: PropertyArea;
  maxArea?: PropertyArea;
  
  // Year built range
  minYearBuilt?: number;
  maxYearBuilt?: number;
  
  // Features
  features?: string[];
  
  // Geospatial search
  nearbySearch?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  
  // Pagination and sorting
  limit?: number;
  cursor?: string;
  sortBy?: 'createdAt' | 'price' | 'area' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// Property with computed fields (for responses)
export interface PropertyWithComputedFields extends PropertyData {
  pricePerSqm: number | null;
  propertyAge: number | null;
}

// Statistics
export interface PropertyStats {
  total: number;
  byStatus: {
    forSale: number;
    forRent: number;
    sold: number;
  };
  pricing: {
    average: number;
    median: number;
    min: number;
    max: number;
  };
  lastUpdated: string;
}

// Pagination metadata
export interface PaginationData {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  totalEstimate?: number;
}

// Paginated result
export interface PaginatedPropertyData {
  properties: PropertyWithComputedFields[];
  pagination: PaginationData;
}