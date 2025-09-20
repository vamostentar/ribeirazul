import { PropertyCreateInput, PropertyFilters, PropertyResponse, PropertyUpdateInput } from '../types/property';

export interface IPropertyRepository {
  create(data: PropertyCreateInput): Promise<PropertyResponse>;
  findById(id: string): Promise<PropertyResponse | null>;
  findMany(filters: PropertyFilters): Promise<PropertyResponse[]>;
  update(id: string, data: PropertyUpdateInput): Promise<PropertyResponse>;
  delete(id: string): Promise<void>;
  count(filters?: Partial<PropertyFilters>): Promise<number>;
  findNearby(filters: PropertyFilters): Promise<PropertyResponse[]>;
}

export interface IRepositoryFactory {
  createPropertyRepository(): IPropertyRepository;
}
