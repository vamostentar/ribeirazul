import { AuthController } from '@/controllers/auth.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { AuthService } from '@/services/auth.service';
import {
  type ChangePasswordRequest,
  type LoginRequest,
  type RefreshTokenRequest,
  type RegisterRequest
} from '@/types/auth';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as PrismaClient;
  const authService = new AuthService(prisma);
  const authController = new AuthController(authService);

  // Public routes
  fastify.post<{ Body: LoginRequest }>('/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'User login',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
          rememberMe: { type: 'boolean' },
          twoFactorCode: { type: 'string', minLength: 6, maxLength: 6 },
        },
      },
      response: {
        200: {
          description: 'Login successful',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                    tokenType: { type: 'string' },
                  },
                },
                requiresTwoFactor: { type: 'boolean' },
                tempToken: { type: 'string' },
              },
            },
            meta: { type: 'object' },
          },
        },
        401: {
          description: 'Invalid credentials',
          type: 'object',
        },
      },
    },
  }, authController.login.bind(authController));

  fastify.post<{ Body: RegisterRequest }>('/register', {
    schema: {
      tags: ['Authentication'],
      summary: 'User registration',
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'phone'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 50 },
          lastName: { type: 'string', minLength: 1, maxLength: 50 },
          username: { type: 'string', minLength: 3, maxLength: 30 },
          phone: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Registration successful',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                message: { type: 'string' },
              },
            },
            meta: { type: 'object' },
          },
        },
        409: {
          description: 'Email already exists',
          type: 'object',
        },
        400: {
          description: 'Validation error',
          type: 'object',
        },
      },
    },
  }, authController.register.bind(authController));

  fastify.post('/2fa/complete', {
    schema: {
      tags: ['Authentication'],
      summary: 'Complete two-factor authentication',
      body: {
        type: 'object',
        required: ['tempToken', 'code'],
        properties: {
          tempToken: { type: 'string' },
          code: { type: 'string', minLength: 6, maxLength: 6 },
        },
      },
      response: {
        200: {
          description: '2FA successful',
          type: 'object',
        },
        401: {
          description: 'Invalid 2FA code',
          type: 'object',
        },
      },
    },
  }, authController.complete2FA.bind(authController));

  fastify.post<{ Body: RefreshTokenRequest }>('/refresh', {
    schema: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          description: 'Token refreshed',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                    tokenType: { type: 'string' },
                  },
                },
              },
            },
            meta: { type: 'object' },
          },
        },
        401: {
          description: 'Invalid refresh token',
          type: 'object',
        },
      },
    },
  }, authController.refreshToken.bind(authController));

  // Protected routes
  fastify.register(async function authenticatedRoutes(fastify) {
    fastify.addHook('onRequest', authenticate);

    fastify.post('/logout', {
      schema: {
        tags: ['Authentication'],
        summary: 'User logout',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Logout successful',
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
    }, authController.logout.bind(authController));

    fastify.post<{ Body: ChangePasswordRequest }>('/change-password', {
      schema: {
        tags: ['Authentication'],
        summary: 'Change password',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword', 'confirmPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 1 },
            newPassword: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            description: 'Password changed',
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
          401: {
            description: 'Current password incorrect',
            type: 'object',
          },
        },
      },
    }, authController.changePassword.bind(authController));

    // Two-factor authentication routes
    fastify.post('/2fa/enable', {
      schema: {
        tags: ['Authentication'],
        summary: 'Enable two-factor authentication',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: '2FA setup initiated',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  secret: { type: 'string' },
                  qrCode: { type: 'string' },
                  backupCodes: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, authController.enable2FA.bind(authController));

    fastify.post('/2fa/confirm', {
      schema: {
        tags: ['Authentication'],
        summary: 'Confirm two-factor authentication setup',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['secret', 'token'],
          properties: {
            secret: { type: 'string' },
            token: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
        response: {
          200: {
            description: '2FA enabled',
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
          400: {
            description: 'Invalid 2FA code',
            type: 'object',
          },
        },
      },
    }, authController.confirm2FA.bind(authController));

    fastify.post('/2fa/disable', {
      schema: {
        tags: ['Authentication'],
        summary: 'Disable two-factor authentication',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['password', 'token'],
          properties: {
            password: { type: 'string', minLength: 8 },
            token: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
        response: {
          200: {
            description: '2FA disabled',
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
          401: {
            description: 'Invalid password or 2FA code',
            type: 'object',
          },
        },
      },
    }, authController.disable2FA.bind(authController));
  });
}
