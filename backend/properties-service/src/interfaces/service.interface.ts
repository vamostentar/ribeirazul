import { PropertyCreateInput, PropertyFilters, PropertyResponse, PropertyUpdateInput } from '../types/property';

export interface IPropertyService {
  createProperty(data: PropertyCreateInput): Promise<PropertyResponse>;
  getPropertyById(id: string): Promise<PropertyResponse>;
  getProperties(filters: Partial<PropertyFilters> & { limit: number; sortBy: string; sortOrder: string }): Promise<{ data: PropertyResponse[]; pagination: any }>;
  updateProperty(id: string, data: PropertyUpdateInput): Promise<PropertyResponse>;
  deleteProperty(id: string): Promise<void>;
  getPropertiesStats(): Promise<any>;
  searchProperties(query: string, limit?: number): Promise<any>;
  getNearbyProperties(lat: number, lng: number, radius?: number, limit?: number): Promise<any>;
}

export interface IMediaService {
  uploadImage(file: Buffer, filename: string, propertyId: string): Promise<string>;
  deleteImage(imageUrl: string): Promise<void>;
  getImageUrl(filename: string): string;
}

export interface IEventBus {
  publish(event: string, data: any): Promise<void>;
  subscribe(event: string, handler: (data: any) => Promise<void>): void;
}

export interface IServiceFactory {
  createPropertyService(): IPropertyService;
  createMediaService(): IMediaService;
  createEventBus(): IEventBus;
}
