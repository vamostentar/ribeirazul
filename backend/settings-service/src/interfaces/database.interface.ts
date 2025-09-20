import { CreateModuleSettingsRequest, ModuleSettings, PaginatedResult, SearchOptions, SettingsHistory, SystemSettings, UpdateModuleSettingsRequest, UpdateSettingsRequest } from '@/types/settings';

/**
 * Interface para abstração de banco de dados
 * Permite trocar implementações (Prisma, TypeORM, etc.) sem afetar o código de negócio
 */
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;

  // Transaction support
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;

  // Settings operations
  settings: SettingsRepositoryInterface;

  // Module settings operations
  moduleSettings: ModuleSettingsRepositoryInterface;

  // History operations
  history: SettingsHistoryRepositoryInterface;
}

/**
 * Interface para transações de banco de dados
 */
export interface DatabaseTransaction {
  settings: SettingsRepositoryInterface;
  moduleSettings: ModuleSettingsRepositoryInterface;
  history: SettingsHistoryRepositoryInterface;
}

/**
 * Interface para repositório de configurações principais
 */
export interface SettingsRepositoryInterface {
  // Operações CRUD básicas
  findById(id: string): Promise<SystemSettings | null>;
  create(data: Partial<SystemSettings>): Promise<SystemSettings>;
  update(id: string, data: Partial<SystemSettings>): Promise<SystemSettings>;
  delete(id: string): Promise<void>;

  // Operações específicas
  getCurrentSettings(): Promise<SystemSettings>;
  updateSettings(data: UpdateSettingsRequest, updatedBy?: string): Promise<SystemSettings>;
  resetToDefaults(updatedBy?: string): Promise<SystemSettings>;
  
  // Validações
  validateSettings(data: UpdateSettingsRequest): Promise<{ valid: boolean; errors: string[] }>;
  
  // Verificações
  exists(id: string): Promise<boolean>;
  isMaintenanceMode(): Promise<boolean>;
}

/**
 * Interface para repositório de configurações de módulo
 */
export interface ModuleSettingsRepositoryInterface {
  // Operações CRUD básicas
  findById(id: string): Promise<ModuleSettings | null>;
  findByModuleAndKey(moduleName: string, settingsKey: string): Promise<ModuleSettings | null>;
  create(data: CreateModuleSettingsRequest): Promise<ModuleSettings>;
  update(id: string, data: UpdateModuleSettingsRequest): Promise<ModuleSettings>;
  delete(id: string): Promise<void>;

  // Operações de busca
  findByModule(moduleName: string): Promise<ModuleSettings[]>;
  findMany(options: SearchOptions): Promise<PaginatedResult<ModuleSettings>>;
  
  // Operações específicas
  getModuleSettings(moduleName: string): Promise<Record<string, any>>;
  updateModuleSettings(moduleName: string, settings: Record<string, any>, updatedBy?: string): Promise<void>;
  deleteModuleSettings(moduleName: string): Promise<void>;
  
  // Validações
  validateModuleSettings(moduleName: string, settings: Record<string, any>): Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * Interface para repositório de histórico
 */
export interface SettingsHistoryRepositoryInterface {
  // Operações CRUD básicas
  findById(id: string): Promise<SettingsHistory | null>;
  create(data: Partial<SettingsHistory>): Promise<SettingsHistory>;
  findMany(options: SearchOptions): Promise<PaginatedResult<SettingsHistory>>;

  // Operações específicas
  findBySettingsId(settingsId: string, options?: SearchOptions): Promise<PaginatedResult<SettingsHistory>>;
  findByField(fieldName: string, options?: SearchOptions): Promise<PaginatedResult<SettingsHistory>>;
  findByUser(userId: string, options?: SearchOptions): Promise<PaginatedResult<SettingsHistory>>;
  
  // Limpeza
  deleteOldEntries(olderThan: Date): Promise<number>;
  deleteBySettingsId(settingsId: string): Promise<number>;
}

/**
 * Interface para cache
 */
export interface CacheManager {
  // Operações básicas
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Operações específicas
  getSettings(): Promise<SystemSettings | null>;
  setSettings(settings: SystemSettings, ttl?: number): Promise<void>;
  invalidateSettings(): Promise<void>;
  
  getModuleSettings(moduleName: string): Promise<Record<string, any> | null>;
  setModuleSettings(moduleName: string, settings: Record<string, any>, ttl?: number): Promise<void>;
  invalidateModuleSettings(moduleName: string): Promise<void>;

  // Operações de cache
  exists(key: string): Promise<boolean>;
  getTTL(key: string): Promise<number>;
  extendTTL(key: string, ttl: number): Promise<void>;

  // Health check
  isHealthy(): Promise<boolean>;
  getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
    memory: number;
  }>;
}

/**
 * Interface para observabilidade
 */
export interface ObservabilityManager {
  // Logging
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;

  // Métricas
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  recordGauge(name: string, value: number, labels?: Record<string, string>): void;

  // Tracing
  startTrace(name: string): string;
  startSpan(traceId: string, name: string): string;
  endSpan(spanId: string): void;
  endTrace(traceId: string): void;

  // Health check
  checkHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      lastCheck: string;
      error?: string;
    }>;
  }>;

  // Métricas específicas do settings service
  recordSettingsUpdate(fieldName: string, userId?: string): void;
  recordSettingsRead(userId?: string): void;
  recordModuleSettingsUpdate(moduleName: string, userId?: string): void;
  recordCacheHit(key: string): void;
  recordCacheMiss(key: string): void;
}

/**
 * Interface para validação de configurações
 */
export interface SettingsValidator {
  validateSystemSettings(data: UpdateSettingsRequest): Promise<{ valid: boolean; errors: string[] }>;
  validateModuleSettings(moduleName: string, settings: Record<string, any>): Promise<{ valid: boolean; errors: string[] }>;
  validateColor(color: string): boolean;
  validateEmail(email: string): boolean;
  validatePhone(phone: string): boolean;
  validateUrl(url: string): boolean;
  validateJsonSchema(data: any, schema: any): Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * Interface para serialização/deserialização
 */
export interface SettingsSerializer {
  serialize(settings: SystemSettings): string;
  deserialize(data: string): SystemSettings;
  serializeModuleSettings(settings: Record<string, any>): string;
  deserializeModuleSettings(data: string): Record<string, any>;
  validateSerializedData(data: string): boolean;
}
