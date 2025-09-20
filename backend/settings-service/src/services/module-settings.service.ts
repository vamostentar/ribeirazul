import { CacheManager, DatabaseConnection, ObservabilityManager, SettingsValidator } from '@/interfaces/database.interface';
import { CreateModuleSettingsRequest, ModuleSettings, OperationResult, PaginatedResult, RequestContext, SearchOptions, UpdateModuleSettingsRequest } from '@/types/settings';

/**
 * Serviço de configurações de módulo
 * Gerencia configurações específicas por módulo/serviço
 */
export class ModuleSettingsService {
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
   * Obtém todas as configurações de um módulo
   */
  async getModuleSettings(moduleName: string): Promise<OperationResult<Record<string, any>>> {
    const traceId = this.observability.startTrace('get_module_settings');
    
    try {
      // Tentar obter do cache primeiro
      let settings = await this.cache.getModuleSettings(moduleName);
      
      if (settings) {
        this.observability.recordCacheHit(`module:${moduleName}`);
        this.observability.endTrace(traceId);
        
        return {
          success: true,
          data: settings,
        };
      }

      this.observability.recordCacheMiss(`module:${moduleName}`);
      
      // Obter do banco de dados
      settings = await this.database.moduleSettings.getModuleSettings(moduleName);
      
      // Armazenar no cache
      await this.cache.setModuleSettings(moduleName, settings);
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      this.observability.error('Erro ao obter configurações do módulo', { error, moduleName, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Atualiza configurações de um módulo
   */
  async updateModuleSettings(
    moduleName: string,
    settings: Record<string, any>,
    context?: RequestContext
  ): Promise<OperationResult<void>> {
    const traceId = this.observability.startTrace('update_module_settings');
    
    try {
      // Validar configurações do módulo
      const validation = await this.validator.validateModuleSettings(moduleName, settings);
      if (!validation.valid) {
        this.observability.warn('Validação de configurações de módulo falhou', { 
          moduleName, 
          errors: validation.errors 
        });
        this.observability.endTrace(traceId);
        
        return {
          success: false,
          error: 'Dados inválidos',
          message: validation.errors.join(', '),
        };
      }

      // Atualizar no banco de dados
      await this.database.moduleSettings.updateModuleSettings(
        moduleName,
        settings,
        context?.userId
      );

      // Invalidar cache
      await this.cache.invalidateModuleSettings(moduleName);
      
      // Armazenar nova versão no cache
      await this.cache.setModuleSettings(moduleName, settings);

      // Registrar métricas
      this.observability.recordModuleSettingsUpdate(moduleName, context?.userId);

      this.observability.info('Configurações de módulo atualizadas com sucesso', {
        moduleName,
        fields: Object.keys(settings),
        userId: context?.userId,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        message: 'Configurações de módulo atualizadas com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao atualizar configurações de módulo', { 
        error, 
        moduleName, 
        traceId 
      });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Cria uma nova configuração de módulo
   */
  async createModuleSetting(
    data: CreateModuleSettingsRequest,
    context?: RequestContext
  ): Promise<OperationResult<ModuleSettings>> {
    const traceId = this.observability.startTrace('create_module_setting');
    
    try {
      // Verificar se já existe
      const existing = await this.database.moduleSettings.findByModuleAndKey(
        data.moduleName,
        data.settingsKey
      );

      if (existing) {
        this.observability.warn('Configuração de módulo já existe', { 
          moduleName: data.moduleName, 
          settingsKey: data.settingsKey 
        });
        this.observability.endTrace(traceId);
        
        return {
          success: false,
          error: 'Configuração já existe',
          message: `Configuração ${data.settingsKey} já existe para o módulo ${data.moduleName}`,
        };
      }

      // Validar configuração específica
      const validation = await this.validator.validateModuleSettings(
        data.moduleName,
        { [data.settingsKey]: data.settingsValue }
      );

      if (!validation.valid) {
        this.observability.warn('Validação de configuração de módulo falhou', { 
          moduleName: data.moduleName, 
          settingsKey: data.settingsKey,
          errors: validation.errors 
        });
        this.observability.endTrace(traceId);
        
        return {
          success: false,
          error: 'Dados inválidos',
          message: validation.errors.join(', '),
        };
      }

      // Criar no banco de dados
      const moduleSetting = await this.database.moduleSettings.create(data);

      // Invalidar cache do módulo
      await this.cache.invalidateModuleSettings(data.moduleName);

      this.observability.info('Configuração de módulo criada com sucesso', {
        moduleName: data.moduleName,
        settingsKey: data.settingsKey,
        userId: context?.userId,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: moduleSetting,
        message: 'Configuração de módulo criada com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao criar configuração de módulo', { 
        error, 
        moduleName: data.moduleName, 
        settingsKey: data.settingsKey,
        traceId 
      });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Atualiza uma configuração específica de módulo
   */
  async updateModuleSetting(
    id: string,
    data: UpdateModuleSettingsRequest,
    context?: RequestContext
  ): Promise<OperationResult<ModuleSettings>> {
    const traceId = this.observability.startTrace('update_module_setting');
    
    try {
      // Obter configuração existente
      const existing = await this.database.moduleSettings.findById(id);
      if (!existing) {
        this.observability.warn('Configuração de módulo não encontrada', { id });
        this.observability.endTrace(traceId);
        
        return {
          success: false,
          error: 'Configuração não encontrada',
        };
      }

      // Validar se os dados estão sendo atualizados
      if (data.settingsValue !== undefined) {
        const validation = await this.validator.validateModuleSettings(
          existing.moduleName,
          { [existing.settingsKey]: data.settingsValue }
        );

        if (!validation.valid) {
          this.observability.warn('Validação de configuração de módulo falhou', { 
            moduleName: existing.moduleName, 
            settingsKey: existing.settingsKey,
            errors: validation.errors 
          });
          this.observability.endTrace(traceId);
          
          return {
            success: false,
            error: 'Dados inválidos',
            message: validation.errors.join(', '),
          };
        }
      }

      // Atualizar no banco de dados
      const updatedSetting = await this.database.moduleSettings.update(id, data);

      // Invalidar cache do módulo
      await this.cache.invalidateModuleSettings(existing.moduleName);

      this.observability.info('Configuração de módulo atualizada com sucesso', {
        moduleName: existing.moduleName,
        settingsKey: existing.settingsKey,
        userId: context?.userId,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: updatedSetting,
        message: 'Configuração de módulo atualizada com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao atualizar configuração de módulo', { 
        error, 
        id, 
        traceId 
      });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Remove uma configuração de módulo
   */
  async deleteModuleSetting(id: string, context?: RequestContext): Promise<OperationResult<void>> {
    const traceId = this.observability.startTrace('delete_module_setting');
    
    try {
      // Obter configuração existente para obter informações
      const existing = await this.database.moduleSettings.findById(id);
      if (!existing) {
        this.observability.warn('Configuração de módulo não encontrada para exclusão', { id });
        this.observability.endTrace(traceId);
        
        return {
          success: false,
          error: 'Configuração não encontrada',
        };
      }

      // Remover do banco de dados
      await this.database.moduleSettings.delete(id);

      // Invalidar cache do módulo
      await this.cache.invalidateModuleSettings(existing.moduleName);

      this.observability.info('Configuração de módulo removida com sucesso', {
        moduleName: existing.moduleName,
        settingsKey: existing.settingsKey,
        userId: context?.userId,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        message: 'Configuração de módulo removida com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao remover configuração de módulo', { 
        error, 
        id, 
        traceId 
      });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Remove todas as configurações de um módulo
   */
  async deleteModuleSettings(moduleName: string, context?: RequestContext): Promise<OperationResult<void>> {
    const traceId = this.observability.startTrace('delete_module_settings');
    
    try {
      // Remover do banco de dados
      await this.database.moduleSettings.deleteModuleSettings(moduleName);

      // Invalidar cache do módulo
      await this.cache.invalidateModuleSettings(moduleName);

      this.observability.info('Todas as configurações de módulo removidas com sucesso', {
        moduleName,
        userId: context?.userId,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        message: 'Todas as configurações de módulo removidas com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao remover configurações de módulo', { 
        error, 
        moduleName, 
        traceId 
      });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Lista configurações de módulo com paginação
   */
  async listModuleSettings(options: SearchOptions): Promise<OperationResult<PaginatedResult<ModuleSettings>>> {
    const traceId = this.observability.startTrace('list_module_settings');
    
    try {
      const result = await this.database.moduleSettings.findMany(options);
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.observability.error('Erro ao listar configurações de módulo', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Obtém uma configuração específica de módulo
   */
  async getModuleSetting(moduleName: string, settingsKey: string): Promise<OperationResult<any>> {
    try {
      const moduleSettings = await this.getModuleSettings(moduleName);
      
      if (!moduleSettings.success || !moduleSettings.data) {
        return {
          success: false,
          error: 'Configurações do módulo não encontradas',
        };
      }

      return {
        success: true,
        data: moduleSettings.data[settingsKey],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}
