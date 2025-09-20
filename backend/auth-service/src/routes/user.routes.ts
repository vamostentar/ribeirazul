import { UserController } from '@/controllers/user.controller';
import { authenticate, requireRole } from '@/middlewares/auth.middleware';
import { UserService } from '@/services/user.service';
import {
    type CreateUserRequest,
    type UpdateUserRequest,
    type UserListQuery,
} from '@/types/auth';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

export async function userRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as PrismaClient;
  const userService = new UserService(prisma);
  const userController = new UserController(userService);

  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Current user routes
  fastify.get('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'User profile',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
      },
    },
  }, userController.getProfile.bind(userController));

  fastify.put<{ Body: Partial<UpdateUserRequest> }>('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Update current user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: true,
      },
      response: {
        200: {
          description: 'Profile updated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
      },
    },
  }, userController.updateProfile.bind(userController));

  // Admin-only routes
  fastify.register(async function adminRoutes(fastify) {
    fastify.addHook('onRequest', requireRole(['admin', 'super_admin']));

    // User statistics
    fastify.get('/statistics', {
      schema: {
        tags: ['Users'],
        summary: 'Get user statistics',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'User statistics',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  active: { type: 'number' },
                  inactive: { type: 'number' },
                  verified: { type: 'number' },
                  unverified: { type: 'number' },
                  withTwoFactor: { type: 'number' },
                  recentLogins: { type: 'number' },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, userController.getUserStatistics.bind(userController));

    // Search users
    fastify.get<{ Querystring: { query: string; limit?: number } }>('/search', {
      schema: {
        tags: ['Users'],
        summary: 'Search users',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            description: 'Search results',
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
    }, userController.searchUsers.bind(userController));

    // List users
    fastify.get<{ Querystring: UserListQuery }>('/', {
      schema: {
        tags: ['Users'],
        summary: 'List all users',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            sortBy: { type: 'string' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            search: { type: 'string' },
            roleId: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'User list',
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
    }, userController.listUsers.bind(userController));

    // Get user by ID
    fastify.get<{ Params: { userId: string } }>('/:userId', {
      schema: {
        tags: ['Users'],
        summary: 'Get user by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'User details',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
          404: {
            description: 'User not found',
            type: 'object',
          },
        },
      },
    }, userController.getUser.bind(userController));

    // Create user
    fastify.post<{ Body: CreateUserRequest }>('/', {
      schema: {
        tags: ['Users'],
        summary: 'Create new user',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'phone'],
          properties: {
            email: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            username: { type: 'string' },
            phone: { type: 'string' },
            roleId: { type: 'string' },
            isActive: { type: 'boolean' },
            sendWelcomeEmail: { type: 'boolean' },
          },
        },
        response: {
          201: {
            description: 'User created',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
          409: {
            description: 'Email already exists',
            type: 'object',
          },
        },
      },
    }, userController.createUser.bind(userController));

    // Update user
    fastify.put<{ Params: { userId: string }; Body: Partial<UpdateUserRequest> }>('/:userId', {
      schema: {
        tags: ['Users'],
        summary: 'Update user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: true,
        },
        response: {
          200: {
            description: 'User updated',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
          404: {
            description: 'User not found',
            type: 'object',
          },
        },
      },
    }, userController.updateUser.bind(userController));

    // Delete user
    fastify.delete<{ Params: { userId: string } }>('/:userId', {
      schema: {
        tags: ['Users'],
        summary: 'Delete user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'User deleted',
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
            description: 'User not found',
            type: 'object',
          },
        },
      },
    }, userController.deleteUser.bind(userController));

    // Activate user
    fastify.post<{ Params: { userId: string } }>('/:userId/activate', {
      schema: {
        tags: ['Users'],
        summary: 'Activate user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'User activated',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, userController.activateUser.bind(userController));

    // Deactivate user
    fastify.post<{ Params: { userId: string } }>('/:userId/deactivate', {
      schema: {
        tags: ['Users'],
        summary: 'Deactivate user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'User deactivated',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, userController.deactivateUser.bind(userController));

    // Reset password
    fastify.post<{ Params: { userId: string }; Body: { newPassword: string } }>('/:userId/reset-password', {
      schema: {
        tags: ['Users'],
        summary: 'Reset user password',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['newPassword'],
          properties: {
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            description: 'Password reset',
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
    }, userController.resetUserPassword.bind(userController));

    // Verify email
    fastify.post<{ Params: { userId: string } }>('/:userId/verify-email', {
      schema: {
        tags: ['Users'],
        summary: 'Verify user email',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Email verified',
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
    }, userController.verifyUserEmail.bind(userController));

    // Communication routes
    fastify.post<{ Body: { type: 'email' | 'notification' | 'bulk_email'; subject: string; message: string; userIds: string[]; template?: string } }>('/communication/send', {
      schema: {
        tags: ['Users'],
        summary: 'Send communication to users',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['type', 'subject', 'message', 'userIds'],
          properties: {
            type: { type: 'string', enum: ['email', 'notification', 'bulk_email'] },
            subject: { type: 'string', minLength: 1 },
            message: { type: 'string', minLength: 1 },
            userIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            template: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Communication sent',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  sentCount: { type: 'number' },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, userController.sendCommunication.bind(userController));

    // Bulk import routes
    fastify.post<{ Body: { users: Array<{ email: string; firstName: string; lastName: string; phone?: string; role: string; isActive: boolean; isVerified: boolean }> } }>('/bulk-import', {
      schema: {
        tags: ['Users'],
        summary: 'Bulk import users',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['users'],
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                required: ['email', 'firstName', 'lastName', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  firstName: { type: 'string', minLength: 1 },
                  lastName: { type: 'string', minLength: 1 },
                  phone: { type: 'string' },
                  role: { type: 'string', enum: ['client', 'agent', 'admin', 'super_admin'] },
                  isActive: { type: 'boolean', default: true },
                  isVerified: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        response: {
          200: {
            description: 'Users imported',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  imported: { type: 'number' },
                  failed: { type: 'number' },
                  errors: { type: 'array', items: { type: 'string' } },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, userController.bulkImportUsers.bind(userController));

    // Audit routes
    fastify.get<{ Params: { userId: string }; Querystring: { period?: string; limit?: number } }>('/:userId/audit', {
      schema: {
        tags: ['Users'],
        summary: 'Get user audit logs',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['24h', '7d', '30d', '90d', 'all'], default: '7d' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            description: 'Audit logs',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    action: { type: 'string' },
                    description: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    ipAddress: { type: 'string' },
                    userAgent: { type: 'string' },
                    metadata: { type: 'object' },
                  },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, userController.getUserAuditLogs.bind(userController));

    // Permissions routes
    fastify.get<{ Params: { userId: string } }>('/:userId/permissions', {
      schema: {
        tags: ['Users'],
        summary: 'Get user permissions',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'User permissions',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  role: { type: 'string' },
                  permissions: { type: 'array', items: { type: 'string' } },
                  customPermissions: { type: 'array', items: { type: 'string' } },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, userController.getUserPermissions.bind(userController));

    fastify.put<{ Params: { userId: string }; Body: { permissions: string[] } }>('/:userId/permissions', {
      schema: {
        tags: ['Users'],
        summary: 'Update user permissions',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['permissions'],
          properties: {
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            description: 'Permissions updated',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  permissions: { type: 'array', items: { type: 'string' } },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, userController.updateUserPermissions.bind(userController));
  });
}
