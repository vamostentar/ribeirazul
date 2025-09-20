import { DatabaseConnection, DatabaseTransaction, ModuleSettingsRepositoryInterface, SettingsHistoryRepositoryInterface, SettingsRepositoryInterface } from '@/interfaces/database.interface';
import { CreateModuleSettingsRequest, ModuleSettings, PaginatedResult, SearchOptions, SettingsHistory, SystemSettings, UpdateModuleSettingsRequest, UpdateSettingsRequest } from '@/types/settings';
import { PrismaClient } from '@prisma/client';

interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  enableLogging: boolean;
}

/**
 * Implementação do banco de dados usando Prisma
 */
export class PrismaDatabase implements DatabaseConnection {
  private prisma: PrismaClient;

  constructor(private config: DatabaseConfig) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.url,
        },
      },
      log: config.enableLogging ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
    } catch (error) {
      throw new Error(`Falha ao conectar ao banco de dados: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (prismaTx: any) => {
      const tx = new PrismaTransaction(prismaTx);
      return callback(tx);
    });
  }

  get settings(): SettingsRepositoryInterface {
    return new PrismaSettingsRepository(this.prisma);
  }

  get moduleSettings(): ModuleSettingsRepositoryInterface {
    return new PrismaModuleSettingsRepository(this.prisma);
  }

  get history(): SettingsHistoryRepositoryInterface {
    return new PrismaSettingsHistoryRepository(this.prisma);
  }
}

/**
 * Implementação de transação Prisma
 */
class PrismaTransaction implements DatabaseTransaction {
  constructor(private prismaTx: any) {}

  get settings(): SettingsRepositoryInterface {
    return new PrismaSettingsRepository(this.prismaTx);
  }

  get moduleSettings(): ModuleSettingsRepositoryInterface {
    return new PrismaModuleSettingsRepository(this.prismaTx);
  }

  get history(): SettingsHistoryRepositoryInterface {
    return new PrismaSettingsHistoryRepository(this.prismaTx);
  }
}

/**
 * Implementação do repositório de configurações principais
 */
class PrismaSettingsRepository implements SettingsRepositoryInterface {
  constructor(private prisma: PrismaClient | any) {}

  async findById(id: string): Promise<SystemSettings | null> {
    const settings = await this.prisma.settings.findUnique({
      where: { id },
    });

    return settings ? this.mapToSystemSettings(settings) : null;
  }

  async create(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const settings = await this.prisma.settings.create({
      data: this.mapToPrismaSettings(data),
    });

    return this.mapToSystemSettings(settings);
  }

  async update(id: string, data: Partial<SystemSettings>): Promise<SystemSettings> {
    const settings = await this.prisma.settings.update({
      where: { id },
      data: this.mapToPrismaSettings(data),
    });

    return this.mapToSystemSettings(settings);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.settings.delete({
      where: { id },
    });
  }

  async getCurrentSettings(): Promise<SystemSettings> {
    let settings = await this.findById('singleton');
    
    if (!settings) {
      // Criar configurações padrão se não existirem
      settings = await this.create({
        id: 'singleton',
        brandName: 'Ribeira Azul',
        primaryColor: '#2563eb',
        secondaryColor: '#1f2937',
        accentColor: '#f59e0b',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        contactEmail: 'contato@ribeirazul.com',
        contactPhone: '+55 11 99999-9999',
        contactAddress: 'São Paulo, SP',
        maintenanceMode: false,
      });
    }

    return settings;
  }

  async updateSettings(data: UpdateSettingsRequest, updatedBy?: string): Promise<SystemSettings> {
    const existingSettings = await this.getCurrentSettings();
    
    const updatedSettings = await this.update('singleton', {
      ...existingSettings,
      ...data,
      ...(updatedBy && { updatedBy }),
      updatedAt: new Date(),
    });

    // Registrar histórico da alteração
    if (this.prisma.settingsHistory) {
      for (const [key, value] of Object.entries(data)) {
        if (existingSettings[key as keyof SystemSettings] !== value) {
          await this.prisma.settingsHistory.create({
            data: {
              settingsId: 'singleton',
              fieldName: key,
              oldValue: String(existingSettings[key as keyof SystemSettings] || ''),
              newValue: String(value || ''),
              changedBy: updatedBy,
              changeReason: 'API Update',
            },
          });
        }
      }
    }

    return updatedSettings;
  }

  async resetToDefaults(updatedBy?: string): Promise<SystemSettings> {
    const defaultSettings = {
      brandName: 'Ribeira Azul',
      primaryColor: '#2563eb',
      secondaryColor: '#1f2937',
      accentColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      contactEmail: 'contato@ribeirazul.com',
      contactPhone: '+55 11 99999-9999',
      contactAddress: 'São Paulo, SP',
      maintenanceMode: false,
      ...(updatedBy && { updatedBy }),
      updatedAt: new Date(),
    };

    return this.update('singleton', defaultSettings);
  }

  async validateSettings(data: UpdateSettingsRequest): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validações básicas
    if (data.brandName && data.brandName.length < 2) {
      errors.push('Nome da marca deve ter pelo menos 2 caracteres');
    }

    if (data.primaryColor && !this.isValidColor(data.primaryColor)) {
      errors.push('Cor primária inválida');
    }

    if (data.secondaryColor && !this.isValidColor(data.secondaryColor)) {
      errors.push('Cor secundária inválida');
    }

    if (data.contactEmail && !this.isValidEmail(data.contactEmail)) {
      errors.push('Email de contacto inválido');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.settings.count({
      where: { id },
    });
    return count > 0;
  }

  async isMaintenanceMode(): Promise<boolean> {
    const settings = await this.findById('singleton');
    return settings?.maintenanceMode || false;
  }

  private mapToSystemSettings(prismaSettings: any): SystemSettings {
    return {
      id: prismaSettings.id,
      brandName: prismaSettings.brandName,
      logoUrl: prismaSettings.logoUrl,
      faviconUrl: prismaSettings.faviconUrl,
      primaryColor: prismaSettings.primaryColor,
      secondaryColor: prismaSettings.secondaryColor,
      accentColor: prismaSettings.accentColor,
      backgroundColor: prismaSettings.backgroundColor,
      textColor: prismaSettings.textColor,
      contactEmail: prismaSettings.contactEmail,
      contactPhone: prismaSettings.contactPhone,
      contactAddress: prismaSettings.contactAddress,
      socialLinks: prismaSettings.socialLinks as any,
      businessHours: prismaSettings.businessHours as any,
      businessConfig: prismaSettings.businessConfig as any,
      seoTitle: prismaSettings.seoTitle,
      seoDescription: prismaSettings.seoDescription,
      seoKeywords: prismaSettings.seoKeywords,
      maintenanceMode: prismaSettings.maintenanceMode,
      createdAt: prismaSettings.createdAt,
      updatedAt: prismaSettings.updatedAt,
      updatedBy: prismaSettings.updatedBy,
    };
  }

  private mapToPrismaSettings(settings: Partial<SystemSettings>): any {
    return {
      id: settings.id,
      brandName: settings.brandName,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      contactAddress: settings.contactAddress,
      socialLinks: settings.socialLinks,
      businessHours: settings.businessHours,
      businessConfig: settings.businessConfig,
      seoTitle: settings.seoTitle,
      seoDescription: settings.seoDescription,
      seoKeywords: settings.seoKeywords,
      maintenanceMode: settings.maintenanceMode,
      updatedBy: settings.updatedBy,
    };
  }

  private isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

/**
 * Implementação do repositório de configurações de módulo
 */
class PrismaModuleSettingsRepository implements ModuleSettingsRepositoryInterface {
  constructor(private prisma: PrismaClient | any) {}

  async findById(id: string): Promise<ModuleSettings | null> {
    const settings = await this.prisma.moduleSettings.findUnique({
      where: { id },
    });

    return settings ? this.mapToModuleSettings(settings) : null;
  }

  async findByModuleAndKey(moduleName: string, settingsKey: string): Promise<ModuleSettings | null> {
    const settings = await this.prisma.moduleSettings.findUnique({
      where: {
        moduleName_settingsKey: {
          moduleName,
          settingsKey,
        },
      },
    });

    return settings ? this.mapToModuleSettings(settings) : null;
  }

  async create(data: CreateModuleSettingsRequest): Promise<ModuleSettings> {
    const settings = await this.prisma.moduleSettings.create({
      data: {
        moduleName: data.moduleName,
        settingsKey: data.settingsKey,
        settingsValue: data.settingsValue,
        description: data.description,
      },
    });

    return this.mapToModuleSettings(settings);
  }

  async update(id: string, data: UpdateModuleSettingsRequest): Promise<ModuleSettings> {
    const settings = await this.prisma.moduleSettings.update({
      where: { id },
      data: {
        settingsValue: data.settingsValue,
        description: data.description,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    });

    return this.mapToModuleSettings(settings);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.moduleSettings.delete({
      where: { id },
    });
  }

  async findByModule(moduleName: string): Promise<ModuleSettings[]> {
    const settings = await this.prisma.moduleSettings.findMany({
      where: { moduleName },
      orderBy: { createdAt: 'asc' },
    });

    return settings.map((s: any) => this.mapToModuleSettings(s));
  }

  async findMany(options: SearchOptions): Promise<PaginatedResult<ModuleSettings>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (options.filters) {
      Object.assign(where, options.filters);
    }

    const [settings, total] = await Promise.all([
      this.prisma.moduleSettings.findMany({
        where,
        skip,
        take: limit,
        orderBy: options.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { createdAt: 'desc' },
      }),
      this.prisma.moduleSettings.count({ where }),
    ]);

    return {
      data: settings.map((s: any) => this.mapToModuleSettings(s)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getModuleSettings(moduleName: string): Promise<Record<string, any>> {
    const settings = await this.findByModule(moduleName);
    const result: Record<string, any> = {};

    for (const setting of settings) {
      if (setting.isActive) {
        result[setting.settingsKey] = setting.settingsValue;
      }
    }

    return result;
  }

  async updateModuleSettings(moduleName: string, settings: Record<string, any>, updatedBy?: string): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      const existing = await this.findByModuleAndKey(moduleName, key);
      
      if (existing) {
        await this.update(existing.id, { settingsValue: value });
      } else {
        await this.create({
          moduleName,
          settingsKey: key,
          settingsValue: value,
        });
      }
    }
  }

  async deleteModuleSettings(moduleName: string): Promise<void> {
    await this.prisma.moduleSettings.deleteMany({
      where: { moduleName },
    });
  }

  async validateModuleSettings(moduleName: string, settings: Record<string, any>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validações básicas por módulo
    if (moduleName === 'auth' && settings.maxLoginAttempts && settings.maxLoginAttempts < 1) {
      errors.push('Máximo de tentativas de login deve ser pelo menos 1');
    }

    if (moduleName === 'media' && settings.maxFileSize && settings.maxFileSize < 1024) {
      errors.push('Tamanho máximo de arquivo deve ser pelo menos 1KB');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private mapToModuleSettings(prismaSettings: any): ModuleSettings {
    return {
      id: prismaSettings.id,
      moduleName: prismaSettings.moduleName,
      settingsKey: prismaSettings.settingsKey,
      settingsValue: prismaSettings.settingsValue,
      description: prismaSettings.description,
      isActive: prismaSettings.isActive,
      createdAt: prismaSettings.createdAt,
      updatedAt: prismaSettings.updatedAt,
      updatedBy: prismaSettings.updatedBy,
    };
  }
}

/**
 * Implementação do repositório de histórico
 */
class PrismaSettingsHistoryRepository implements SettingsHistoryRepositoryInterface {
  constructor(private prisma: PrismaClient | any) {}

  async findById(id: string): Promise<SettingsHistory | null> {
    const history = await this.prisma.settingsHistory.findUnique({
      where: { id },
    });

    return history ? this.mapToSettingsHistory(history) : null;
  }

  async create(data: Partial<SettingsHistory>): Promise<SettingsHistory> {
    const history = await this.prisma.settingsHistory.create({
      data: {
        settingsId: data.settingsId || 'singleton',
        fieldName: data.fieldName!,
        oldValue: data.oldValue,
        newValue: data.newValue,
        changedBy: data.changedBy,
        changeReason: data.changeReason,
      },
    });

    return this.mapToSettingsHistory(history);
  }

  async findMany(options: SearchOptions): Promise<PaginatedResult<SettingsHistory>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (options.filters) {
      Object.assign(where, options.filters);
    }

    const [history, total] = await Promise.all([
      this.prisma.settingsHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: options.sortBy ? { [options.sortBy]: options.sortOrder || 'desc' } : { createdAt: 'desc' },
      }),
      this.prisma.settingsHistory.count({ where }),
    ]);

    return {
      data: history.map((h: any) => this.mapToSettingsHistory(h)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySettingsId(settingsId: string, options?: SearchOptions): Promise<PaginatedResult<SettingsHistory>> {
    return this.findMany({
      ...options,
      filters: { settingsId },
    });
  }

  async findByField(fieldName: string, options?: SearchOptions): Promise<PaginatedResult<SettingsHistory>> {
    return this.findMany({
      ...options,
      filters: { fieldName },
    });
  }

  async findByUser(userId: string, options?: SearchOptions): Promise<PaginatedResult<SettingsHistory>> {
    return this.findMany({
      ...options,
      filters: { changedBy: userId },
    });
  }

  async deleteOldEntries(olderThan: Date): Promise<number> {
    const result = await this.prisma.settingsHistory.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    });

    return result.count;
  }

  async deleteBySettingsId(settingsId: string): Promise<number> {
    const result = await this.prisma.settingsHistory.deleteMany({
      where: { settingsId },
    });

    return result.count;
  }

  private mapToSettingsHistory(prismaHistory: any): SettingsHistory {
    return {
      id: prismaHistory.id,
      settingsId: prismaHistory.settingsId,
      fieldName: prismaHistory.fieldName,
      oldValue: prismaHistory.oldValue,
      newValue: prismaHistory.newValue,
      changedBy: prismaHistory.changedBy,
      changeReason: prismaHistory.changeReason,
      createdAt: prismaHistory.createdAt,
    };
  }
}
