import { ModuleSettingsController } from '@/controllers/module-settings.controller';
import { FastifyInstance } from 'fastify';

/**
 * Rotas de configurações de módulo
 * Gerencia configurações específicas por módulo/serviço
 */
export async function moduleSettingsRoutes(fastify: FastifyInstance) {
  const moduleSettingsController = new ModuleSettingsController();

  // GET /module-settings/:moduleName - Obtém configurações de um módulo
  fastify.get('/module-settings/:moduleName', {
    schema: {
      description: 'Obtém todas as configurações de um módulo específico',
      tags: ['Module Settings'],
      params: {
        type: 'object',
        properties: {
          moduleName: { type: 'string' },
        },
        required: ['moduleName'],
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
                module: { type: 'string' },
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
  }, moduleSettingsController.getModuleSettings.bind(moduleSettingsController));

  // PUT /module-settings/:moduleName - Atualiza configurações de um módulo
  fastify.put('/module-settings/:moduleName', {
    schema: {
      description: 'Atualiza configurações de um módulo específico',
      tags: ['Module Settings'],
      params: {
        type: 'object',
        properties: {
          moduleName: { type: 'string' },
        },
        required: ['moduleName'],
      },
      body: {
        type: 'object',
        additionalProperties: true,
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
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
                module: { type: 'string' },
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
  }, moduleSettingsController.updateModuleSettings.bind(moduleSettingsController));

  // POST /module-settings - Cria nova configuração de módulo
  fastify.post('/module-settings', {
    schema: {
      description: 'Cria uma nova configuração de módulo',
      tags: ['Module Settings'],
      body: {
        type: 'object',
        properties: {
          moduleName: { type: 'string' },
          settingsKey: { type: 'string' },
          settingsValue: { type: 'object' },
          description: { type: 'string' },
        },
        required: ['moduleName', 'settingsKey', 'settingsValue'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
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
        409: {
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
  }, moduleSettingsController.createModuleSetting.bind(moduleSettingsController));

  // PUT /module-settings/setting/:id - Atualiza configuração específica de módulo
  fastify.put('/module-settings/setting/:id', {
    schema: {
      description: 'Atualiza uma configuração específica de módulo',
      tags: ['Module Settings'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          settingsValue: { type: 'object' },
          description: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
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
        404: {
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
  }, moduleSettingsController.updateModuleSetting.bind(moduleSettingsController));

  // DELETE /module-settings/setting/:id - Remove configuração específica de módulo
  fastify.delete('/module-settings/setting/:id', {
    schema: {
      description: 'Remove uma configuração específica de módulo',
      tags: ['Module Settings'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        204: {
          type: 'null',
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
  }, moduleSettingsController.deleteModuleSetting.bind(moduleSettingsController));

  // DELETE /module-settings/module/:moduleName - Remove todas as configurações de um módulo
  fastify.delete('/module-settings/module/:moduleName', {
    schema: {
      description: 'Remove todas as configurações de um módulo específico',
      tags: ['Module Settings'],
      params: {
        type: 'object',
        properties: {
          moduleName: { type: 'string' },
        },
        required: ['moduleName'],
      },
      response: {
        204: {
          type: 'null',
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
  }, moduleSettingsController.deleteModuleSettings.bind(moduleSettingsController));

  // GET /module-settings - Lista configurações de módulo com paginação
  fastify.get('/module-settings', {
    schema: {
      description: 'Lista configurações de módulo com paginação',
      tags: ['Module Settings'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100 },
          filters: { type: 'string' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object' } },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
                total: { type: 'number' },
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
  }, moduleSettingsController.listModuleSettings.bind(moduleSettingsController));

  // GET /module-settings/:moduleName/:settingsKey - Obtém configuração específica
  fastify.get('/module-settings/:moduleName/:settingsKey', {
    schema: {
      description: 'Obtém uma configuração específica de um módulo',
      tags: ['Module Settings'],
      params: {
        type: 'object',
        properties: {
          moduleName: { type: 'string' },
          settingsKey: { type: 'string' },
        },
        required: ['moduleName', 'settingsKey'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                module: { type: 'string' },
                key: { type: 'string' },
                value: { type: 'object' },
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
  }, moduleSettingsController.getModuleSetting.bind(moduleSettingsController));
}
