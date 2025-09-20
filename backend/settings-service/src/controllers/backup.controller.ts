import { dependencyConfig } from '@/config/dependency-config';
import { BackupRequest, BackupService, RestoreRequest } from '@/services/backup.service';
import { ERROR_CODES, HTTP_STATUS } from '@/types/common';
import { FastifyReply, FastifyRequest } from 'fastify';

interface BackupRequestBody {
  type: 'full' | 'incremental' | 'settings';
  description?: string;
}

interface RestoreRequestBody {
  backupId: string;
  confirmRestore: boolean;
}

export class BackupController {
  private backupService: BackupService;

  constructor() {
    this.backupService = new BackupService();
    this.backupService.dependencies = {
      database: dependencyConfig.database,
      observability: dependencyConfig.observability,
    };
  }

  private createRequestContext(request: FastifyRequest) {
    return {
      userId: (request as any).user?.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || '',
      timestamp: new Date(),
    };
  }

  /**
   * POST /backup - Cria um novo backup
   */
  async createBackup(request: FastifyRequest<{ Body: BackupRequestBody }>, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    
    try {
      const backupRequest: BackupRequest = {
        type: request.body.type,
        description: request.body.description,
      };

      const result = await this.backupService.createBackup(backupRequest, context);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.INTERNAL_ERROR,
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
      dependencyConfig.observability.error('Erro no controller createBackup', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /backup - Lista todos os backups
   */
  async listBackups(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    
    try {
      const result = await this.backupService.listBackups();
      
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
      dependencyConfig.observability.error('Erro no controller listBackups', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * POST /backup/restore - Restaura um backup
   */
  async restoreBackup(request: FastifyRequest<{ Body: RestoreRequestBody }>, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    
    try {
      const restoreRequest: RestoreRequest = {
        backupId: request.body.backupId,
        confirmRestore: request.body.confirmRestore,
      };

      const result = await this.backupService.restoreBackup(restoreRequest, context);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.VALIDATION_ERROR,
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
      dependencyConfig.observability.error('Erro no controller restoreBackup', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * DELETE /backup/:backupId - Remove um backup
   */
  async deleteBackup(request: FastifyRequest<{ Params: { backupId: string } }>, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    
    try {
      const { backupId } = request.params;

      const result = await this.backupService.deleteBackup(backupId, context);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: result.message,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller deleteBackup', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * GET /backup/:backupId/download - Download de um backup
   */
  async downloadBackup(request: FastifyRequest<{ Params: { backupId: string } }>, reply: FastifyReply): Promise<void> {
    const context = this.createRequestContext(request);
    
    try {
      const { backupId } = request.params;

      const result = await this.backupService.downloadBackup(backupId);
      
      if (!result.success) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: result.error,
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // Configurar headers para download
      reply.header('Content-Type', 'application/gzip');
      reply.header('Content-Disposition', `attachment; filename="backup_${backupId}.json.gz"`);
      
      return reply.status(HTTP_STATUS.OK).send(result.data);
    } catch (error) {
      dependencyConfig.observability.error('Erro no controller downloadBackup', { error });
      
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: 'Erro interno do servidor',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  }
}
