import { dependencyConfig } from '@/config/dependency-config';
import { SettingsService } from '@/services/settings.service';
import { ERROR_CODES, HTTP_STATUS } from '@/types/common';
import { RequestContext, SettingsResponse, UpdateSettingsRequest } from '@/types/settings';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Controller principal de configurações
 * Gerencia as rotas GET/PUT /settings
 */
export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService({
      database: dependencyConfig.database,
      cache: dependencyConfig.cache,
      observability: dependencyConfig.observability,
      validator: dependencyConfig.validator,
    });
  }

  /**
   * GET /settings - Obtém configurações atuais
   */
  async getSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    
    try {
      const result = await this.settingsService.getCurrentSettings(context);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.INTERNAL_ERROR,
        });
      }

      const response: SettingsResponse = {
        success: true,
        data: result.data!,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getSettings', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * PUT /settings - Atualiza configurações
   */
  async updateSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const updateData = request.body as UpdateSettingsRequest;
    
    try {
      // Validar dados de entrada
      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: 'Dados de atualização são obrigatórios',
          code: ERROR_CODES.VALIDATION_ERROR,
        });
      }

      const result = await this.settingsService.updateSettings(updateData, context);
      
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

      const response: SettingsResponse = {
        success: true,
        data: result.data!,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller updateSettings', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * POST /settings/reset - Reseta configurações para padrão
   */
  async resetSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    
    try {
      const result = await this.settingsService.resetToDefaults(context);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.INTERNAL_ERROR,
        });
      }

      const response: SettingsResponse = {
        success: true,
        data: result.data!,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller resetSettings', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /settings/field/:fieldName - Obtém um campo específico
   */
  async getSettingsField(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const { fieldName } = request.params as { fieldName: string };
    
    try {
      const result = await this.settingsService.getSettingsField(fieldName as any);
      
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
          field: fieldName,
          value: result.data,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getSettingsField', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * PUT /settings/field/:fieldName - Atualiza um campo específico
   */
  async updateSettingsField(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    const { fieldName } = request.params as { fieldName: string };
    const { value } = request.body as { value: any };
    
    try {
      if (value === undefined) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: 'Valor é obrigatório',
          code: ERROR_CODES.VALIDATION_ERROR,
        });
      }

      const result = await this.settingsService.updateSettingsField(fieldName as any, value, context);
      
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

      const response: SettingsResponse = {
        success: true,
        data: result.data!,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller updateSettingsField', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * POST /settings/validate - Valida configurações sem salvá-las
   */
  async validateSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const updateData = request.body as UpdateSettingsRequest;
    
    try {
      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: 'Dados para validação são obrigatórios',
          code: ERROR_CODES.VALIDATION_ERROR,
        });
      }

      const result = await this.settingsService.validateSettings(updateData);
      
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
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller validateSettings', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /settings/stats - Obtém estatísticas do serviço
   */
  async getServiceStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = await this.settingsService.getServiceStats();
      
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
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller getServiceStats', { error });
      
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
