import { RoleController } from '@/controllers/role.controller';
import { authenticate, requireRole } from '@/middlewares/auth.middleware';
import { RoleService } from '@/services/role.service';
import {
    type CreateRoleRequest,
    type RoleListQuery,
    type UpdateRoleRequest,
} from '@/types/auth';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

export async function roleRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as PrismaClient;
  const roleService = new RoleService(prisma);
  const roleController = new RoleController(roleService);

  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Available permissions (read-only)
  fastify.get('/permissions', {
    schema: {
      tags: ['Roles'],
      summary: 'Get available permissions',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Available permissions',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                },
                categories: { type: 'object' },
              },
            },
            meta: { type: 'object' },
          },
        },
      },
    },
  }, roleController.getAvailablePermissions.bind(roleController));

  // List roles (requires read permission)
  fastify.get<{ Querystring: RoleListQuery }>('/', {
    schema: {
      tags: ['Roles'],
      summary: 'List all roles',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          isActive: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Role list',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            meta: {
              type: 'object',
              properties: {
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    totalPages: { type: 'number' },
                    hasNext: { type: 'boolean' },
                    hasPrev: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, roleController.listRoles.bind(roleController));

  // Get role by ID
  fastify.get<{ Params: { roleId: string } }>('/:roleId', {
    schema: {
      tags: ['Roles'],
      summary: 'Get role by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Role details',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
        404: {
          description: 'Role not found',
          type: 'object',
        },
      },
    },
  }, roleController.getRole.bind(roleController));

  // Get users with role
  fastify.get<{ Params: { roleId: string }; Querystring: { page?: number; limit?: number } }>('/:roleId/users', {
    schema: {
      tags: ['Roles'],
      summary: 'Get users with role',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        },
      },
      response: {
        200: {
          description: 'Users with role',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            meta: { type: 'object' },
          },
        },
      },
    },
  }, roleController.getUsersWithRole.bind(roleController));

  // Check role usage
  fastify.get<{ Params: { roleId: string } }>('/:roleId/usage', {
    schema: {
      tags: ['Roles'],
      summary: 'Check role usage',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Role usage information',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                role: { type: 'object' },
                userCount: { type: 'number' },
                isSystemRole: { type: 'boolean' },
                canDelete: { type: 'boolean' },
              },
            },
            meta: { type: 'object' },
          },
        },
      },
    },
  }, roleController.checkRoleUsage.bind(roleController));

  // Admin-only routes
  fastify.register(async function adminRoutes(fastify) {
    fastify.addHook('onRequest', requireRole(['admin', 'super_admin']));

    // Create role
    fastify.post<{ Body: CreateRoleRequest }>('/', {
      schema: {
        tags: ['Roles'],
        summary: 'Create new role',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'displayName', 'permissions'],
          properties: {
            name: { type: 'string' },
            displayName: { type: 'string' },
            description: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' }, minItems: 1 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          201: {
            description: 'Role created',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
          409: {
            description: 'Role name already exists',
            type: 'object',
          },
        },
      },
    }, roleController.createRole.bind(roleController));

    // Update role
    fastify.put<{ Params: { roleId: string }; Body: Partial<UpdateRoleRequest> }>('/:roleId', {
      schema: {
        tags: ['Roles'],
        summary: 'Update role',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['roleId'],
          properties: {
            roleId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: true,
        },
        response: {
          200: {
            description: 'Role updated',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
          404: {
            description: 'Role not found',
            type: 'object',
          },
          400: {
            description: 'System roles cannot be updated',
            type: 'object',
          },
        },
      },
    }, roleController.updateRole.bind(roleController));

    // Delete role
    fastify.delete<{ Params: { roleId: string } }>('/:roleId', {
      schema: {
        tags: ['Roles'],
        summary: 'Delete role',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['roleId'],
          properties: {
            roleId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Role deleted',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
              meta: { type: 'object' },
            },
          },
          404: {
            description: 'Role not found',
            type: 'object',
          },
          400: {
            description: 'System roles cannot be deleted',
            type: 'object',
          },
          409: {
            description: 'Role is in use',
            type: 'object',
          },
        },
      },
    }, roleController.deleteRole.bind(roleController));

    // Assign role to users
    fastify.post<{ Params: { roleId: string }; Body: { userIds: string[] } }>('/:roleId/assign', {
      schema: {
        tags: ['Roles'],
        summary: 'Assign role to users',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['roleId'],
          properties: {
            roleId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['userIds'],
          properties: {
            userIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 1,
            },
          },
        },
        response: {
          200: {
            description: 'Role assigned',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, roleController.assignRole.bind(roleController));
  });
}
