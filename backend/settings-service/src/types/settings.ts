/**
 * Tipos para o Settings Service
 * Seguindo princípios de arquitetura black box
 */

// Configurações principais do sistema
export interface SystemSettings {
  id: string;
  
  // Branding
  brandName: string;
  logoUrl?: string;
  faviconUrl?: string;
  
  // Cores
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Contactos
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  
  // Redes sociais
  socialLinks?: SocialLinks;
  
  // Horários de funcionamento
  businessHours?: BusinessHours;
  
  // Configurações de negócio
  businessConfig?: BusinessConfig;
  
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  
  // Configurações técnicas
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  
  // Metadados
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

// Redes sociais
export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  whatsapp?: string;
}

// Horários de funcionamento
export interface BusinessHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

// Configurações de negócio
export interface BusinessConfig {
  currency?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

// Histórico de alterações
export interface SettingsHistory {
  id: string;
  settingsId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changedBy?: string;
  changeReason?: string;
  createdAt: Date;
}

// Configurações de módulo
export interface ModuleSettings {
  id: string;
  moduleName: string;
  settingsKey: string;
  settingsValue: any;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

// DTOs para requisições
export interface UpdateSettingsRequest {
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  socialLinks?: SocialLinks;
  businessHours?: BusinessHours;
  businessConfig?: BusinessConfig;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

export interface CreateModuleSettingsRequest {
  moduleName: string;
  settingsKey: string;
  settingsValue: any;
  description?: string;
}

export interface UpdateModuleSettingsRequest {
  settingsValue?: any;
  description?: string;
  isActive?: boolean;
}

// Respostas da API
export interface SettingsResponse {
  success: boolean;
  data: SystemSettings;
  meta: {
    timestamp: string;
    version: string;
  };
}

export interface ModuleSettingsResponse {
  success: boolean;
  data: ModuleSettings[];
  meta: {
    timestamp: string;
    version: string;
    total: number;
  };
}

export interface SettingsHistoryResponse {
  success: boolean;
  data: SettingsHistory[];
  meta: {
    timestamp: string;
    version: string;
    total: number;
  };
}

// Configurações padrão
export const DEFAULT_SETTINGS: Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  brandName: 'Ribeira Azul',
  primaryColor: '#2563eb',
  secondaryColor: '#1f2937',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  contactEmail: 'contato@ribeirazul.com',
  contactPhone: '+55 11 99999-9999',
  contactAddress: 'São Paulo, SP',
  socialLinks: {
    facebook: 'https://facebook.com/ribeirazul',
    instagram: 'https://instagram.com/ribeirazul',
    linkedin: 'https://linkedin.com/company/ribeirazul'
  },
  businessHours: {
    monday: '08:00 - 18:00',
    tuesday: '08:00 - 18:00',
    wednesday: '08:00 - 18:00',
    thursday: '08:00 - 18:00',
    friday: '08:00 - 18:00',
    saturday: '09:00 - 16:00',
    sunday: 'Fechado'
  },
  businessConfig: {
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    maxFileSize: 10485760, // 10MB
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
  },
  maintenanceMode: false
};

// Tipos para validação
export interface SettingsValidationResult {
  valid: boolean;
  errors: string[];
}

// Contexto de requisição
export interface RequestContext {
  userId?: string;
  userRole?: string;
  ip?: string;
  userAgent: string;
  timestamp: Date;
}

// Tipos para paginação e busca
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// Resultado de operação
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
