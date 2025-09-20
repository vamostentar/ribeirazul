import { DatabaseConnection, ObservabilityManager } from '@/interfaces/database.interface';
import { OperationResult, PaginatedResult, SearchOptions, SettingsHistory } from '@/types/settings';

/**
 * Serviço de histórico de configurações
 * Gerencia o histórico de alterações nas configurações
 */
export class SettingsHistoryService {
  private _database?: DatabaseConnection;
  private _observability?: ObservabilityManager;

  constructor(
    private dependencyConfig: {
      database: DatabaseConnection;
      observability: ObservabilityManager;
    }
  ) {}

  // Lazy loading das dependências
  private get database(): DatabaseConnection {
    if (!this._database) {
      this._database = this.dependencyConfig.database;
    }
    return this._database;
  }

  private get observability(): ObservabilityManager {
    if (!this._observability) {
      this._observability = this.dependencyConfig.observability;
    }
    return this._observability;
  }

  /**
   * Obtém histórico de alterações das configurações principais
   */
  async getSettingsHistory(options?: SearchOptions): Promise<OperationResult<PaginatedResult<SettingsHistory>>> {
    const traceId = this.observability.startTrace('get_settings_history');
    
    try {
      const searchOptions: SearchOptions = {
        ...options,
        filters: {
          ...options?.filters,
          settingsId: 'singleton',
        },
      };

      const result = await this.database.history.findMany(searchOptions);
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.observability.error('Erro ao obter histórico de configurações', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Obtém histórico de alterações por campo específico
   */
  async getFieldHistory(fieldName: string, options?: SearchOptions): Promise<OperationResult<PaginatedResult<SettingsHistory>>> {
    const traceId = this.observability.startTrace('get_field_history');
    
    try {
      const searchOptions: SearchOptions = {
        ...options,
        filters: {
          ...options?.filters,
          fieldName,
        },
      };

      const result = await this.database.history.findMany(searchOptions);
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.observability.error('Erro ao obter histórico de campo', { error, fieldName, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Obtém histórico de alterações por usuário
   */
  async getUserHistory(userId: string, options?: SearchOptions): Promise<OperationResult<PaginatedResult<SettingsHistory>>> {
    const traceId = this.observability.startTrace('get_user_history');
    
    try {
      const searchOptions: SearchOptions = {
        ...options,
        filters: {
          ...options?.filters,
          changedBy: userId,
        },
      };

      const result = await this.database.history.findMany(searchOptions);
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.observability.error('Erro ao obter histórico do usuário', { error, userId, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Obtém histórico de alterações por período
   */
  async getHistoryByPeriod(
    startDate: Date,
    endDate: Date,
    options?: SearchOptions
  ): Promise<OperationResult<PaginatedResult<SettingsHistory>>> {
    const traceId = this.observability.startTrace('get_history_by_period');
    
    try {
      const searchOptions: SearchOptions = {
        ...options,
        filters: {
          ...options?.filters,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      };

      const result = await this.database.history.findMany(searchOptions);
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.observability.error('Erro ao obter histórico por período', { 
        error, 
        startDate, 
        endDate, 
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
   * Obtém estatísticas do histórico
   */
  async getHistoryStats(): Promise<OperationResult<{
    totalChanges: number;
    changesByField: Record<string, number>;
    changesByUser: Record<string, number>;
    changesByMonth: Record<string, number>;
    lastChange?: Date;
  }>> {
    const traceId = this.observability.startTrace('get_history_stats');
    
    try {
      // Obter todas as alterações (limitado para performance)
      const allHistory = await this.database.history.findMany({
        limit: 10000, // Limite para evitar sobrecarga
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (!allHistory.data || allHistory.data.length === 0) {
        this.observability.endTrace(traceId);
        return {
          success: false,
          error: 'Erro ao obter histórico',
        };
      }

      const history = allHistory.data;
      
      // Calcular estatísticas
      const stats = {
        totalChanges: history.length,
        changesByField: {} as Record<string, number>,
        changesByUser: {} as Record<string, number>,
        changesByMonth: {} as Record<string, number>,
        lastChange: history.length > 0 ? history[0]!.createdAt : new Date(),
      };

      for (const entry of history) {
        // Contar por campo
        stats.changesByField[entry.fieldName] = (stats.changesByField[entry.fieldName] || 0) + 1;
        
        // Contar por usuário
        const user = entry.changedBy || 'anonymous';
        stats.changesByUser[user] = (stats.changesByUser[user] || 0) + 1;
        
        // Contar por mês
        const month = entry.createdAt.toISOString().substring(0, 7); // YYYY-MM
        stats.changesByMonth[month] = (stats.changesByMonth[month] || 0) + 1;
      }

      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.observability.error('Erro ao calcular estatísticas do histórico', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Limpa histórico antigo
   */
  async cleanupOldHistory(olderThanDays: number = 365): Promise<OperationResult<number>> {
    const traceId = this.observability.startTrace('cleanup_old_history');
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deletedCount = await this.database.history.deleteOldEntries(cutoffDate);

      this.observability.info('Histórico antigo limpo com sucesso', {
        deletedCount,
        cutoffDate,
        olderThanDays,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: deletedCount,
        message: `${deletedCount} entradas antigas foram removidas`,
      };
    } catch (error) {
      this.observability.error('Erro ao limpar histórico antigo', { error, olderThanDays, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Exporta histórico para análise
   */
  async exportHistory(options?: SearchOptions): Promise<OperationResult<SettingsHistory[]>> {
    const traceId = this.observability.startTrace('export_history');
    
    try {
      const searchOptions: SearchOptions = {
        ...options,
        limit: 10000, // Limite para exportação
      };

      const result = await this.database.history.findMany(searchOptions);
      
      if (!result.data || result.data.length === 0) {
        this.observability.endTrace(traceId);
        return {
          success: false,
          error: 'Erro ao obter dados para exportação',
        };
      }

      this.observability.info('Histórico exportado com sucesso', {
        recordCount: result.data.length,
      });
      
      this.observability.endTrace(traceId);
      
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      this.observability.error('Erro ao exportar histórico', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Obtém histórico recente (últimas 24 horas)
   */
  async getRecentHistory(): Promise<OperationResult<SettingsHistory[]>> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await this.getHistoryByPeriod(yesterday, new Date(), { limit: 100 });
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'Erro ao obter histórico recente',
      };
    }
    
    return {
      success: true,
      data: result.data.data,
    };
  }

  /**
   * Obtém histórico de um campo específico nas últimas alterações
   */
  async getFieldRecentHistory(fieldName: string, limit: number = 10): Promise<OperationResult<SettingsHistory[]>> {
    const result = await this.getFieldHistory(fieldName, { 
      limit, 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'Erro ao obter histórico do campo',
      };
    }

    return {
      success: true,
      data: result.data.data,
    };
  }
}
