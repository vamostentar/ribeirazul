import { SettingsController } from '@/controllers/settings.controller';
import { FastifyInstance } from 'fastify';

/**
 * Rotas principais de configurações
 * GET/PUT /settings
 */
export async function settingsRoutes(fastify: FastifyInstance) {
  const settingsController = new SettingsController();

  // GET /settings - Obtém configurações atuais
  fastify.get('/settings', {
    schema: {
      description: 'Obtém as configurações atuais do sistema',
      tags: ['Settings'],
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
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, settingsController.getSettings.bind(settingsController));

  // PUT /settings - Atualiza configurações
  fastify.put('/settings', {
    schema: {
      description: 'Atualiza as configurações do sistema',
      tags: ['Settings'],
      body: {
        type: 'object',
        properties: {
          brandName: { type: 'string', minLength: 2, maxLength: 100 },
          logoUrl: { type: 'string', format: 'uri' },
          faviconUrl: { type: 'string', format: 'uri' },
          primaryColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
          secondaryColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
          accentColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
          backgroundColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
          textColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
          contactEmail: { type: 'string', format: 'email' },
          contactPhone: { type: 'string' },
          contactAddress: { type: 'string', maxLength: 500 },
          socialLinks: {
            type: 'object',
            properties: {
              facebook: { type: 'string', format: 'uri' },
              instagram: { type: 'string', format: 'uri' },
              linkedin: { type: 'string', format: 'uri' },
              twitter: { type: 'string', format: 'uri' },
              youtube: { type: 'string', format: 'uri' },
              whatsapp: { type: 'string', format: 'uri' },
            },
          },
          businessHours: {
            type: 'object',
            properties: {
              monday: { type: 'string' },
              tuesday: { type: 'string' },
              wednesday: { type: 'string' },
              thursday: { type: 'string' },
              friday: { type: 'string' },
              saturday: { type: 'string' },
              sunday: { type: 'string' },
            },
          },
          businessConfig: {
            type: 'object',
            properties: {
              currency: { type: 'string', minLength: 3, maxLength: 3 },
              timezone: { type: 'string' },
              language: { type: 'string' },
              dateFormat: { type: 'string' },
              timeFormat: { type: 'string', enum: ['12h', '24h'] },
              maxFileSize: { type: 'number', minimum: 1024 },
              allowedFileTypes: { type: 'array', items: { type: 'string' } },
            },
          },
          seoTitle: { type: 'string', maxLength: 60 },
          seoDescription: { type: 'string', maxLength: 160 },
          seoKeywords: { type: 'string', maxLength: 200 },
          maintenanceMode: { type: 'boolean' },
          maintenanceMessage: { type: 'string', maxLength: 500 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, settingsController.updateSettings.bind(settingsController));

  // POST /settings/reset - Reseta configurações para padrão
  fastify.post('/settings/reset', {
    schema: {
      description: 'Reseta as configurações para os valores padrão',
      tags: ['Settings'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, settingsController.resetSettings.bind(settingsController));

  // GET /settings/field/:fieldName - Obtém um campo específico
  fastify.get('/settings/field/:fieldName', {
    schema: {
      description: 'Obtém um campo específico das configurações',
      tags: ['Settings'],
      params: {
        type: 'object',
        properties: {
          fieldName: { type: 'string' },
        },
        required: ['fieldName'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                value: { type: 'string' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, settingsController.getSettingsField.bind(settingsController));

  // PUT /settings/field/:fieldName - Atualiza um campo específico
  fastify.put('/settings/field/:fieldName', {
    schema: {
      description: 'Atualiza um campo específico das configurações',
      tags: ['Settings'],
      params: {
        type: 'object',
        properties: {
          fieldName: { type: 'string' },
        },
        required: ['fieldName'],
      },
      body: {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
        required: ['value'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, settingsController.updateSettingsField.bind(settingsController));

  // POST /settings/validate - Valida configurações sem salvá-las
  fastify.post('/settings/validate', {
    schema: {
      description: 'Valida configurações sem salvá-las',
      tags: ['Settings'],
      body: {
        type: 'object',
        properties: {
          brandName: { type: 'string' },
          primaryColor: { type: 'string' },
          secondaryColor: { type: 'string' },
          contactEmail: { type: 'string' },
          // ... outros campos
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                errors: { type: 'array', items: { type: 'string' } },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, settingsController.validateSettings.bind(settingsController));

  // GET /settings/stats - Obtém estatísticas do serviço
  fastify.get('/settings/stats', {
    schema: {
      description: 'Obtém estatísticas do serviço de configurações',
      tags: ['Settings'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                cacheStats: { type: 'object' },
                databaseConnected: { type: 'boolean' },
                lastUpdate: { type: 'string', format: 'date-time' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, settingsController.getServiceStats.bind(settingsController));
}
