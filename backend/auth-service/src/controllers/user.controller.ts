import { createSuccessResponse } from '@/middlewares/error-handler';
import { UserService } from '@/services/user.service';
import type {
    CreateUserRequest,
    UpdateUserRequest,
    UserListQuery,
} from '@/types/auth';
import { getRequestContext } from '@/utils/request-context';
import type { FastifyReply, FastifyRequest } from 'fastify';

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Get current user profile
   * GET /api/v1/users/me
   */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const context = getRequestContext(request)!;
    const userId = request.user?.id!;
    
    const user = await this.userService.findById(userId);
    
    return reply.code(200).send(
      createSuccessResponse(user, context.requestId)
    );
  }

  /**
   * Update current user profile
   * PUT /api/v1/users/me
   */
  async updateProfile(
    request: FastifyRequest<{ Body: Partial<UpdateUserRequest> }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const userId = request.user?.id!;
    
    const user = await this.userService.update(userId, request.body, context);
    
    return reply.code(200).send(
      createSuccessResponse(user, context.requestId)
    );
  }

  /**
   * List all users (admin only)
   * GET /api/v1/users
   */
  async listUsers(
    request: FastifyRequest<{ Querystring: UserListQuery }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { page = 1, limit = 20, search, roleId, isActive, sortBy, sortOrder } = request.query;
    
    const result = await this.userService.findMany(
      { page, limit, sortBy, sortOrder },
      { search, roleId, isActive }
    );
    
    return reply.code(200).send(
      createSuccessResponse(result.data, context.requestId, {
        pagination: result.pagination,
      })
    );
  }

  /**
   * Get user by ID (admin only)
   * GET /api/v1/users/:userId
   */
  async getUser(
    request: FastifyRequest<{ Params: { userId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    
    const user = await this.userService.findById(userId);
    
    return reply.code(200).send(
      createSuccessResponse(user, context.requestId)
    );
  }

  /**
   * Create new user (admin only)
   * POST /api/v1/users
   */
  async createUser(
    request: FastifyRequest<{ Body: CreateUserRequest }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const createdBy = request.user?.id!;
    
    const user = await this.userService.create(request.body, createdBy, context);
    
    return reply.code(201).send(
      createSuccessResponse(user, context.requestId)
    );
  }

  /**
   * Update user (admin only)
   * PUT /api/v1/users/:userId
   */
  async updateUser(
    request: FastifyRequest<{ 
      Params: { userId: string }; 
      Body: Partial<UpdateUserRequest> 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const updatedBy = request.user?.id!;
    
    const user = await this.userService.update(userId, request.body, context, updatedBy);
    
    return reply.code(200).send(
      createSuccessResponse(user, context.requestId)
    );
  }

  /**
   * Delete user (admin only)
   * DELETE /api/v1/users/:userId
   */
  async deleteUser(
    request: FastifyRequest<{ Params: { userId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const deletedBy = request.user?.id!;
    
    await this.userService.delete(userId, deletedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse({ message: 'User deleted successfully' }, context.requestId)
    );
  }

  /**
   * Activate user (admin only)
   * POST /api/v1/users/:userId/activate
   */
  async activateUser(
    request: FastifyRequest<{ Params: { userId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const activatedBy = request.user?.id!;
    
    const user = await this.userService.activate(userId, activatedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse(user, context.requestId)
    );
  }

  /**
   * Deactivate user (admin only)
   * POST /api/v1/users/:userId/deactivate
   */
  async deactivateUser(
    request: FastifyRequest<{ Params: { userId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const deactivatedBy = request.user?.id!;
    
    const user = await this.userService.deactivate(userId, deactivatedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse(user, context.requestId)
    );
  }

  /**
   * Get user statistics (admin only)
   * GET /api/v1/users/statistics
   */
  async getUserStatistics(request: FastifyRequest, reply: FastifyReply) {
    const context = getRequestContext(request)!;
    
    const stats = await this.userService.getStatistics();
    
    return reply.code(200).send(
      createSuccessResponse(stats, context.requestId)
    );
  }

  /**
   * Search users (admin only)
   * GET /api/v1/users/search
   */
  async searchUsers(
    request: FastifyRequest<{ Querystring: { query: string; limit?: number } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { query, limit = 20 } = request.query;
    
    const users = await this.userService.search(query, limit);
    
    return reply.code(200).send(
      createSuccessResponse(users, context.requestId)
    );
  }

  /**
   * Reset user password (admin only)
   * POST /api/v1/users/:userId/reset-password
   */
  async resetUserPassword(
    request: FastifyRequest<{ 
      Params: { userId: string };
      Body: { newPassword: string } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const { newPassword } = request.body;
    const resetBy = request.user?.id!;
    
    await this.userService.resetPassword(userId, newPassword, resetBy, context);
    
    return reply.code(200).send(
      createSuccessResponse({ message: 'Password reset successfully' }, context.requestId)
    );
  }

  /**
   * Verify user email (admin only)
   * POST /api/v1/users/:userId/verify-email
   */
  async verifyUserEmail(
    request: FastifyRequest<{ Params: { userId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const verifiedBy = request.user?.id!;
    
    await this.userService.verifyEmail(userId, verifiedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse({ message: 'Email verified successfully' }, context.requestId)
    );
  }

  /**
   * Send communication to users (admin only)
   * POST /api/v1/users/communication/send
   */
  async sendCommunication(
    request: FastifyRequest<{ 
      Body: { 
        type: 'email' | 'notification' | 'bulk_email'; 
        subject: string; 
        message: string; 
        userIds: string[]; 
        template?: string 
      } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { type, subject, message, userIds, template } = request.body;
    const sentBy = request.user?.id!;
    
    const result = await this.userService.sendCommunication({
      type,
      subject,
      message,
      userIds,
      template,
      sentBy
    }, context);
    
    return reply.code(200).send(
      createSuccessResponse(result, context.requestId)
    );
  }

  /**
   * Bulk import users (admin only)
   * POST /api/v1/users/bulk-import
   */
  async bulkImportUsers(
    request: FastifyRequest<{ 
      Body: { 
        users: Array<{ 
          email: string; 
          firstName: string; 
          lastName: string; 
          phone?: string; 
          role: string; 
          isActive: boolean; 
          isVerified: boolean 
        }> 
      } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { users } = request.body;
    const importedBy = request.user?.id!;
    
    const result = await this.userService.bulkImportUsers(users, importedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse(result, context.requestId)
    );
  }

  /**
   * Get user audit logs (admin only)
   * GET /api/v1/users/:userId/audit
   */
  async getUserAuditLogs(
    request: FastifyRequest<{ 
      Params: { userId: string }; 
      Querystring: { period?: string; limit?: number } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const { period = '7d', limit = 50 } = request.query;
    
    const logs = await this.userService.getUserAuditLogs(userId, period, limit);
    
    return reply.code(200).send(
      createSuccessResponse(logs, context.requestId)
    );
  }

  /**
   * Get user permissions (admin only)
   * GET /api/v1/users/:userId/permissions
   */
  async getUserPermissions(
    request: FastifyRequest<{ Params: { userId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    
    const permissions = await this.userService.getUserPermissions(userId);
    
    return reply.code(200).send(
      createSuccessResponse(permissions, context.requestId)
    );
  }

  /**
   * Update user permissions (admin only)
   * PUT /api/v1/users/:userId/permissions
   */
  async updateUserPermissions(
    request: FastifyRequest<{ 
      Params: { userId: string }; 
      Body: { permissions: string[] } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { userId } = request.params;
    const { permissions } = request.body;
    const updatedBy = request.user?.id!;
    
    const result = await this.userService.updateUserPermissions(userId, permissions, updatedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse(result, context.requestId)
    );
  }
}
