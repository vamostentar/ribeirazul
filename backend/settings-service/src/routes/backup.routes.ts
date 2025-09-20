import { BackupController } from '@/controllers/backup.controller';
import { FastifyInstance } from 'fastify';

/**
 * Rotas de backup e restauração
 * POST/GET/DELETE /backup
 */
export async function backupRoutes(fastify: FastifyInstance) {
  const backupController = new BackupController();

  // POST /backup - Cria um novo backup
  fastify.post('/backup', {
    schema: {
      description: 'Cria um novo backup das configurações',
      tags: ['Backup'],
      body: {
        type: 'object',
        required: ['type'],
        properties: {
          type: {
            type: 'string',
            enum: ['full', 'incremental', 'settings'],
            description: 'Tipo de backup a ser criado'
          },
          description: {
            type: 'string',
            description: 'Descrição opcional do backup'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                size: { type: 'string' },
                createdAt: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' }
              }
            },
            message: { type: 'string' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string' },
                version: { type: 'string' }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, backupController.createBackup.bind(backupController));

  // GET /backup - Lista todos os backups
  fastify.get('/backup', {
    schema: {
      description: 'Lista todos os backups disponíveis',
      tags: ['Backup'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  size: { type: 'string' },
                  createdAt: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string' },
                version: { type: 'string' }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, backupController.listBackups.bind(backupController));

  // POST /backup/restore - Restaura um backup
  fastify.post('/backup/restore', {
    schema: {
      description: 'Restaura configurações de um backup',
      tags: ['Backup'],
      body: {
        type: 'object',
        required: ['backupId', 'confirmRestore'],
        properties: {
          backupId: {
            type: 'string',
            description: 'ID do backup a ser restaurado'
          },
          confirmRestore: {
            type: 'boolean',
            description: 'Confirmação de que deseja restaurar (deve ser true)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                brandName: { type: 'string' },
                primaryColor: { type: 'string' },
                secondaryColor: { type: 'string' },
                contactEmail: { type: 'string' },
                contactPhone: { type: 'string' },
                contactAddress: { type: 'string' },
                maintenanceMode: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            },
            message: { type: 'string' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string' },
                version: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, backupController.restoreBackup.bind(backupController));

  // DELETE /backup/:backupId - Remove um backup
  fastify.delete('/backup/:backupId', {
    schema: {
      description: 'Remove um backup específico',
      tags: ['Backup'],
      params: {
        type: 'object',
        required: ['backupId'],
        properties: {
          backupId: {
            type: 'string',
            description: 'ID do backup a ser removido'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string' },
                version: { type: 'string' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, backupController.deleteBackup.bind(backupController));

  // GET /backup/:backupId/download - Download de um backup
  fastify.get('/backup/:backupId/download', {
    schema: {
      description: 'Faz download de um backup específico',
      tags: ['Backup'],
      params: {
        type: 'object',
        required: ['backupId'],
        properties: {
          backupId: {
            type: 'string',
            description: 'ID do backup a ser baixado'
          }
        }
      },
      response: {
        200: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo de backup comprimido'
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, backupController.downloadBackup.bind(backupController));
}
