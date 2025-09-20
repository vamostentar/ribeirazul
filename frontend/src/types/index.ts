export type Property = {
  id: string;
  title: string;
  location: string;
  price: number;
  status: 'for_sale' | 'for_rent' | 'sold';
  adminStatus?: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  type?: 'apartamento' | 'moradia' | 'loft' | 'penthouse' | 'estudio' | 'escritorio' | 'terreno' | null;
  imageUrl?: string | null;
  description?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PropertiesPagination = {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  totalEstimate: number | null;
};

export type PropertiesListResponse = {
  data: Property[];
  pagination?: PropertiesPagination;
};

export type Project = {
  id: string;
  name: string;
  type: 'renovation' | 'construction' | 'design';
  imageUrl?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Lead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  source: string;
  createdAt: string;
};

export type SystemSettings = {
  id: string;
  brandName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
  };
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  businessConfig?: {
    currency: string;
    timezone: string;
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateSystemSettingsRequest = Partial<Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'>>;

export type ModuleSettings = {
  id: string;
  moduleName: string;
  settingsKey: string;
  settingsValue: any;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateModuleSettingRequest = {
  moduleName: string;
  settingsKey: string;
  settingsValue: any;
  description?: string;
};

export type UpdateModuleSettingRequest = Partial<Pick<ModuleSettings, 'settingsValue' | 'description' | 'isActive'>>;

export type ModuleSettingsList = {
  data: ModuleSettings[];
  meta: {
    total: number;
    timestamp: string;
    version: string;
  };
};

export type SettingsOperationResult<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
  };
  error?: string;
  code?: string;
};