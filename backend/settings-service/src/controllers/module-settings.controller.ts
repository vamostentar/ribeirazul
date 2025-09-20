import { dependencyConfig } from '@/config/dependency-config';
import { ModuleSettingsService } from '@/services/module-settings.service';
import { ERROR_CODES, HTTP_STATUS } from '@/types/common';
import { CreateModuleSettingsRequest, ModuleSettingsResponse, RequestContext, SearchOptions, UpdateModuleSettingsRequest } from '@/types/settings';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Controller de configurações de módulo
 * Gerencia configurações específicas por módulo/serviço
 */
export class ModuleSettingsController {
  private moduleSettingsService: ModuleSettingsService;

  constructor() {
    this.moduleSettingsService = new ModuleSettingsService({
      database: dependencyConfig.database,
      cache: dependencyConfig.cache,
      observability: dependencyConfig.observability,
      validator: dependencyConfig.validator,
    });
  }

  /**
   * GET /module-settings/:moduleName - Obtém configurações de um módulo
   */
  async getModuleSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const { moduleName } = request.params as { moduleName: string };
    
    try {
      const result = await this.moduleSettingsService.getModuleSettings(moduleName);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.INTERNAL_ERROR,
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result.data,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          module: moduleName,
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getModuleSettings', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * PUT /module-settings/:moduleName - Atualiza configurações de um módulo
   */
  async updateModuleSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const { moduleName } = request.params as { moduleName: string };
    const settings = request.body as Record<string, any>;
    
    try {
      if (!settings || Object.keys(settings).length === 0) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: 'Configurações são obrigatórias',
          code: ERROR_CODES.VALIDATION_ERROR,
        });
      }

      const result = await this.moduleSettingsService.updateModuleSettings(moduleName, settings, context);
      
      if (!result.success) {
        const statusCode = result.error?.includes('inválidos') 
          ? HTTP_STATUS.BAD_REQUEST 
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        
        const errorCode = result.error?.includes('inválidos') 
          ? ERROR_CODES.VALIDATION_ERROR 
          : ERROR_CODES.INTERNAL_ERROR;

        return reply.status(statusCode).send({
          success: false,
          error: result.error,
          message: result.message,
          code: errorCode,
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: result.message,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          module: moduleName,
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller updateModuleSettings', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * POST /module-settings - Cria nova configuração de módulo
   */
  async createModuleSetting(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const createData = request.body as CreateModuleSettingsRequest;
    
    try {
      if (!createData || !createData.moduleName || !createData.settingsKey) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: 'moduleName e settingsKey são obrigatórios',
          code: ERROR_CODES.VALIDATION_ERROR,
        });
      }

      const result = await this.moduleSettingsService.createModuleSetting(createData, context);
      
      if (!result.success) {
        const statusCode = result.error?.includes('já existe') 
          ? HTTP_STATUS.CONFLICT 
          : result.error?.includes('inválidos') 
            ? HTTP_STATUS.BAD_REQUEST 
            : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        
        const errorCode = result.error?.includes('já existe') 
          ? ERROR_CODES.CONFLICT 
          : result.error?.includes('inválidos') 
            ? ERROR_CODES.VALIDATION_ERROR 
            : ERROR_CODES.INTERNAL_ERROR;

        return reply.status(statusCode).send({
          success: false,
          error: result.error,
          message: result.message,
          code: errorCode,
        });
      }

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: result.data,
        message: result.message,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller createModuleSetting', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * PUT /module-settings/:id - Atualiza configuração específica de módulo
   */
  async updateModuleSetting(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const { id } = request.params as { id: string };
    const updateData = request.body as UpdateModuleSettingsRequest;
    
    try {
      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: 'Dados de atualização são obrigatórios',
          code: ERROR_CODES.VALIDATION_ERROR,
        });
      }

      const result = await this.moduleSettingsService.updateModuleSetting(id, updateData, context);
      
      if (!result.success) {
        const statusCode = result.error?.includes('não encontrada') 
          ? HTTP_STATUS.NOT_FOUND 
          : result.error?.includes('inválidos') 
            ? HTTP_STATUS.BAD_REQUEST 
            : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        
        const errorCode = result.error?.includes('não encontrada') 
          ? ERROR_CODES.NOT_FOUND 
          : result.error?.includes('inválidos') 
            ? ERROR_CODES.VALIDATION_ERROR 
            : ERROR_CODES.INTERNAL_ERROR;

        return reply.status(statusCode).send({
          success: false,
          error: result.error,
          message: result.message,
          code: errorCode,
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result.data,
        message: result.message,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller updateModuleSetting', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * DELETE /module-settings/:id - Remove configuração específica de módulo
   */
  async deleteModuleSetting(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const { id } = request.params as { id: string };
    
    try {
      const result = await this.moduleSettingsService.deleteModuleSetting(id, context);
      
      if (!result.success) {
        const statusCode = result.error?.includes('não encontrada') 
          ? HTTP_STATUS.NOT_FOUND 
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        
        const errorCode = result.error?.includes('não encontrada') 
          ? ERROR_CODES.NOT_FOUND 
          : ERROR_CODES.INTERNAL_ERROR;

        return reply.status(statusCode).send({
          success: false,
          error: result.error,
          code: errorCode,
        });
      }

      return reply.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller deleteModuleSetting', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * DELETE /module-settings/module/:moduleName - Remove todas as configurações de um módulo
   */
  async deleteModuleSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const { moduleName } = request.params as { moduleName: string };
    
    try {
      const result = await this.moduleSettingsService.deleteModuleSettings(moduleName, context);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.INTERNAL_ERROR,
        });
      }

      return reply.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller deleteModuleSettings', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /module-settings - Lista configurações de módulo com paginação
   */
  async listModuleSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = request.query as any;
    const options: SearchOptions = {
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
      filters: query.filters ? JSON.parse(query.filters) : {},
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };
    
    try {
      const result = await this.moduleSettingsService.listModuleSettings(options);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.INTERNAL_ERROR,
        });
      }

      const response: ModuleSettingsResponse = {
        success: true,
        data: result.data!.data,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          total: result.data!.total,
        },
      };

      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller listModuleSettings', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /module-settings/:moduleName/:settingsKey - Obtém configuração específica
   */
  async getModuleSetting(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { moduleName, settingsKey } = request.params as { moduleName: string; settingsKey: string };
    
    try {
      const result = await this.moduleSettingsService.getModuleSetting(moduleName, settingsKey);
      
      if (!result.success) {
        const statusCode = result.error?.includes('não encontradas') 
          ? HTTP_STATUS.NOT_FOUND 
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        
        const errorCode = result.error?.includes('não encontradas') 
          ? ERROR_CODES.NOT_FOUND 
          : ERROR_CODES.INTERNAL_ERROR;

        return reply.status(statusCode).send({
          success: false,
          error: result.error,
          code: errorCode,
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: {
          module: moduleName,
          key: settingsKey,
          value: result.data,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getModuleSetting', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Cria contexto da requisição
   */
  private createRequestContext(request: FastifyRequest): RequestContext {
    return {
      userId: (request as any).user?.id,
      userRole: (request as any).user?.role,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
    };
  }
}
