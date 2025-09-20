import { DatabaseConnection } from '@/interfaces/database.interface';
import { ObservabilityManager } from '@/interfaces/observability.interface';
import { OperationResult } from '@/types/common';
import { RequestContext, SystemSettings } from '@/types/settings';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { createGunzip, createGzip } from 'zlib';

const pipelineAsync = promisify(pipeline);

export interface BackupItem {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  type: 'full' | 'incremental' | 'settings';
  description?: string | undefined;
}

export interface BackupRequest {
  type: 'full' | 'incremental' | 'settings';
  description?: string | undefined;
}

export interface RestoreRequest {
  backupId: string;
  confirmRestore: boolean;
}

export class BackupService {
  private _database?: DatabaseConnection;
  private _observability?: ObservabilityManager;
  private backupDir: string;

  constructor() {
    this.backupDir = process.env.BACKUP_DIR || join(process.cwd(), 'backups');
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  set dependencies(deps: {
    database: DatabaseConnection;
    observability: ObservabilityManager;
  }) {
    this._database = deps.database;
    this._observability = deps.observability;
  }

  private get database(): DatabaseConnection {
    if (!this._database) {
      throw new Error('Database dependency not set');
    }
    return this._database;
  }

  private get observability(): ObservabilityManager {
    if (!this._observability) {
      throw new Error('Observability dependency not set');
    }
    return this._observability;
  }

  /**
   * Cria um backup das configurações
   */
  async createBackup(
    request: BackupRequest,
    context?: RequestContext
  ): Promise<OperationResult<BackupItem>> {
    const traceId = this.observability.startTrace('create_backup');
    
    try {
      const backupId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${request.type}_${timestamp}.json.gz`;
      const filepath = join(this.backupDir, filename);

      // Obter configurações atuais
      const settings = await this.database.settings.getCurrentSettings();
      
      // Preparar dados do backup
      const backupData = {
        id: backupId,
        type: request.type,
        description: request.description,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        settings: settings,
        metadata: {
          createdBy: context?.userId,
          service: 'settings-service',
          environment: process.env.NODE_ENV || 'development',
        }
      };

      // Criar arquivo comprimido
      const writeStream = createWriteStream(filepath);
      const gzipStream = createGzip();
      
      await pipelineAsync(
        JSON.stringify(backupData, null, 2),
        gzipStream,
        writeStream
      );

      // Obter tamanho do arquivo
      const stats = require('fs').statSync(filepath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      const backupItem: BackupItem = {
        id: backupId,
        name: filename,
        size: `${sizeInMB} MB`,
        createdAt: new Date().toISOString(),
        type: request.type,
        description: request.description,
      };

      this.observability.incrementCounter('backup_created', { type: request.type });
      this.observability.info('Backup criado com sucesso', {
        backupId,
        type: request.type,
        size: sizeInMB,
        userId: context?.userId,
      });

      this.observability.endTrace(traceId);

      return {
        success: true,
        data: backupItem,
        message: 'Backup criado com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao criar backup', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Lista todos os backups disponíveis
   */
  async listBackups(): Promise<OperationResult<BackupItem[]>> {
    const traceId = this.observability.startTrace('list_backups');
    
    try {
      const fs = require('fs');
      const files = fs.readdirSync(this.backupDir)
        .filter((file: string) => file.endsWith('.json.gz'))
        .map((file: string) => {
          const filepath = join(this.backupDir, file);
          const stats = fs.statSync(filepath);
          const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
          
          // Extrair informações do nome do arquivo
          const match = file.match(/backup_(full|incremental|settings)_(.+)\.json\.gz/);
          const type = match ? match[1] as 'full' | 'incremental' | 'settings' : 'full';
          const timestamp = match ? match[2] : 'unknown';
          
          return {
            id: file.replace('.json.gz', ''),
            name: file,
            size: `${sizeInMB} MB`,
            createdAt: timestamp ? timestamp.replace(/-/g, ':').replace(/T/, ' ').substring(0, 19) : 'unknown',
            type,
          } as BackupItem;
        })
        .sort((a: BackupItem, b: BackupItem) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      this.observability.endTrace(traceId);

      return {
        success: true,
        data: files,
      };
    } catch (error) {
      this.observability.error('Erro ao listar backups', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Restaura configurações de um backup
   */
  async restoreBackup(
    request: RestoreRequest,
    context?: RequestContext
  ): Promise<OperationResult<SystemSettings>> {
    const traceId = this.observability.startTrace('restore_backup');
    
    try {
      if (!request.confirmRestore) {
        return {
          success: false,
          error: 'Confirmação de restauração é obrigatória',
        };
      }

      // Encontrar arquivo de backup
      const files = require('fs').readdirSync(this.backupDir);
      const backupFile = files.find((file: string) => file.includes(request.backupId));
      
      if (!backupFile) {
        return {
          success: false,
          error: 'Arquivo de backup não encontrado',
        };
      }

      const filepath = join(this.backupDir, backupFile);
      
      // Ler e descomprimir arquivo
      const readStream = createReadStream(filepath);
      const gunzipStream = createGunzip();
      
      let backupData = '';
      gunzipStream.on('data', (chunk) => {
        backupData += chunk.toString();
      });

      await new Promise((resolve, reject) => {
        gunzipStream.on('end', resolve);
        gunzipStream.on('error', reject);
        readStream.pipe(gunzipStream);
      });

      const parsedData = JSON.parse(backupData);
      
      if (!parsedData.settings) {
        return {
          success: false,
          error: 'Arquivo de backup inválido',
        };
      }

      // Restaurar configurações
      const restoredSettings = await this.database.settings.updateSettings(
        parsedData.settings,
        context?.userId
      );

      this.observability.incrementCounter('backup_restored', { backupId: request.backupId });
      this.observability.info('Backup restaurado com sucesso', {
        backupId: request.backupId,
        userId: context?.userId,
      });

      this.observability.endTrace(traceId);

      return {
        success: true,
        data: restoredSettings,
        message: 'Configurações restauradas com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao restaurar backup', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Remove um backup
   */
  async deleteBackup(
    backupId: string,
    context?: RequestContext
  ): Promise<OperationResult<void>> {
    const traceId = this.observability.startTrace('delete_backup');
    
    try {
      const files = require('fs').readdirSync(this.backupDir);
      const backupFile = files.find((file: string) => file.includes(backupId));
      
      if (!backupFile) {
        return {
          success: false,
          error: 'Arquivo de backup não encontrado',
        };
      }

      const filepath = join(this.backupDir, backupFile);
      require('fs').unlinkSync(filepath);

      this.observability.incrementCounter('backup_deleted', { backupId });
      this.observability.info('Backup removido com sucesso', {
        backupId,
        userId: context?.userId,
      });

      this.observability.endTrace(traceId);

      return {
        success: true,
        message: 'Backup removido com sucesso',
      };
    } catch (error) {
      this.observability.error('Erro ao remover backup', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Download de um backup específico
   */
  async downloadBackup(backupId: string): Promise<OperationResult<Buffer>> {
    const traceId = this.observability.startTrace('download_backup');
    
    try {
      const files = require('fs').readdirSync(this.backupDir);
      const backupFile = files.find((file: string) => file.includes(backupId));
      
      if (!backupFile) {
        return {
          success: false,
          error: 'Arquivo de backup não encontrado',
        };
      }

      const filepath = join(this.backupDir, backupFile);
      const fileBuffer = require('fs').readFileSync(filepath);

      this.observability.endTrace(traceId);

      return {
        success: true,
        data: fileBuffer,
      };
    } catch (error) {
      this.observability.error('Erro ao fazer download do backup', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}
