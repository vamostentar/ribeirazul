import { CacheManager, DatabaseConnection, ObservabilityManager, SettingsValidator } from '@/interfaces/database.interface';
import { OperationResult, RequestContext, SystemSettings, UpdateSettingsRequest } from '@/types/settings';

/**
 * Serviço principal de configurações
 * Implementa lazy loading e cache inteligente
 */
export class SettingsService {
  private _database?: DatabaseConnection;
  private _cache?: CacheManager;
  private _observability?: ObservabilityManager;
  private _validator?: SettingsValidator;

  constructor(
    private dependencyConfig: {
      database: DatabaseConnection;
      cache: CacheManager;
      observability: ObservabilityManager;
      validator: SettingsValidator;
    }
  ) {}

  // Lazy loading das dependências
  private get database(): DatabaseConnection {
    if (!this._database) {
      this._database = this.dependencyConfig.database;
    }
    return this._database;
  }

  private get cache(): CacheManager {
    if (!this._cache) {
      this._cache = this.dependencyConfig.cache;
    }
    return this._cache;
  }

  private get observability(): ObservabilityManager {
    if (!this._observability) {
      this._observability = this.dependencyConfig.observability;
    }
    return this._observability;
  }

  private get validator(): SettingsValidator {
    if (!this._validator) {
      this._validator = this.dependencyConfig.validator;
    }
    return this._validator;
  }

  /**
   * Obtém as configurações atuais do sistema
   */
  async getCurrentSettings(context?: RequestContext): Promise<OperationResult<SystemSettings>> {
    const traceId = this.observability.startTrace('get_current_settings');
    
    try {
      // Tentar obter do cache primeiro
      let settings = await this.cache.getSettings();
      
      if (settings) {
        this.observability.recordCacheHit('settings:main');
        this.observability.recordSettingsRead(context?.userId);
        this.observability.endTrace(traceId);
        
        return {
          success: true,
          data: settings,
        };
      }

      this.observability.recordCacheMiss('settings:main');
      
      // Obter do banco de dados
      settings = await this.database.settings.getCurrentSettings();
      
      // Armazenar no cache
      await this.cache.setSettings(settings);
      
      this.observability.recordSettingsRead(context?.userId);
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      this.observability.error('Erro ao obter configurações atuais', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Atualiza as configurações do sistema
   */
  async updateSettings(
    data: UpdateSettingsRequest,
    context?: RequestContext
  ): Promise<OperationResult<SystemSettings>> {
    const traceId = this.observability.startTrace('update_settings');
    
    try {
      // Validar dados de entrada
      const validation = await this.validator.validateSystemSettings(data);
      if (!validation.valid) {
        this.observability.warn('Validação de configurações falhou', { errors: validation.errors });
        this.observability.endTrace(traceId);
        
        return {
          success: false,
          error: 'Dados inválidos',
          message: validation.errors.join(', '),
        };
      }

      // Atualizar no banco de dados
      const updatedSettings = await this.database.settings.updateSettings(
        data,
        context?.userId
      );

      // Invalidar cache
      await this.cache.invalidateSettings();
      
      // Armazenar nova versão no cache
      await this.cache.setSettings(updatedSettings);

      // Registrar métricas
      for (const fieldName of Object.keys(data)) {
        this.observability.recordSettingsUpdate(fieldName, context?.userId);
      }

      this.observability.info('Configurações atualizadas com sucesso', {
        fields: Object.keys(data),
        userId: context?.userId,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: updatedSettings,
        message: 'Configurações atualizadas com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao atualizar configurações', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Reseta as configurações para os valores padrão
   */
  async resetToDefaults(context?: RequestContext): Promise<OperationResult<SystemSettings>> {
    const traceId = this.observability.startTrace('reset_settings');
    
    try {
      const defaultSettings = await this.database.settings.resetToDefaults(context?.userId);
      
      // Invalidar cache
      await this.cache.invalidateSettings();
      
      // Armazenar nova versão no cache
      await this.cache.setSettings(defaultSettings);

      this.observability.recordSettingsUpdate('reset', context?.userId);
      this.observability.info('Configurações resetadas para padrão', {
        userId: context?.userId,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: defaultSettings,
        message: 'Configurações resetadas para os valores padrão',
      };
    } catch (error) {
      this.observability.error('Erro ao resetar configurações', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Verifica se o sistema está em modo de manutenção
   */
  async isMaintenanceMode(): Promise<boolean> {
    try {
      return await this.database.settings.isMaintenanceMode();
    } catch (error) {
      this.observability.error('Erro ao verificar modo de manutenção', { error });
      return false; // Em caso de erro, assumir que não está em manutenção
    }
  }

  /**
   * Valida configurações sem salvá-las
   */
  async validateSettings(data: UpdateSettingsRequest): Promise<OperationResult<{ valid: boolean; errors: string[] }>> {
    try {
      const validation = await this.validator.validateSystemSettings(data);
      
      return {
        success: true,
        data: validation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Obtém configurações específicas (com cache)
   */
  async getSettingsField(fieldName: keyof SystemSettings): Promise<OperationResult<any>> {
    try {
      const settings = await this.getCurrentSettings();
      
      if (!settings.success || !settings.data) {
        return {
          success: false,
          error: 'Configurações não encontradas',
        };
      }

      return {
        success: true,
        data: settings.data[fieldName],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Atualiza um campo específico das configurações
   */
  async updateSettingsField(
    fieldName: keyof SystemSettings,
    value: any,
    context?: RequestContext
  ): Promise<OperationResult<SystemSettings>> {
    const updateData = { [fieldName]: value } as UpdateSettingsRequest;
    return this.updateSettings(updateData, context);
  }

  /**
   * Obtém estatísticas do serviço
   */
  async getServiceStats(): Promise<OperationResult<{
    cacheStats: any;
    databaseConnected: boolean;
    lastUpdate?: Date;
  }>> {
    try {
      const [cacheStats, databaseConnected, currentSettings] = await Promise.all([
        this.cache.getStats(),
        this.database.isConnected(),
        this.getCurrentSettings(),
      ]);

      return {
        success: true,
        data: {
          cacheStats,
          databaseConnected,
          lastUpdate: currentSettings.data?.updatedAt || new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}
