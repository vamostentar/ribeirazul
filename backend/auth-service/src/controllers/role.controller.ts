import { createSuccessResponse } from '@/middlewares/error-handler';
import { RoleService } from '@/services/role.service';
import type {
    CreateRoleRequest,
    RoleListQuery,
    UpdateRoleRequest,
} from '@/types/auth';
import { getRequestContext } from '@/utils/request-context';
import type { FastifyReply, FastifyRequest } from 'fastify';

export class RoleController {
  constructor(private roleService: RoleService) {}

  /**
   * List all roles
   * GET /api/v1/roles
   */
  async listRoles(
    request: FastifyRequest<{ Querystring: RoleListQuery }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { page = 1, limit = 20, isActive, sortBy, sortOrder } = request.query;
    
    const result = await this.roleService.findMany(
      { page, limit, sortBy, sortOrder },
      { isActive }
    );
    
    return reply.code(200).send(
      createSuccessResponse(result.data, context.requestId, {
        pagination: result.pagination,
      })
    );
  }

  /**
   * Get role by ID
   * GET /api/v1/roles/:roleId
   */
  async getRole(
    request: FastifyRequest<{ Params: { roleId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { roleId } = request.params;
    
    const role = await this.roleService.findById(roleId);
    
    return reply.code(200).send(
      createSuccessResponse(role, context.requestId)
    );
  }

  /**
   * Create new role (admin only)
   * POST /api/v1/roles
   */
  async createRole(
    request: FastifyRequest<{ Body: CreateRoleRequest }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const createdBy = request.user?.id!;
    
    const role = await this.roleService.create(request.body, createdBy, context);
    
    return reply.code(201).send(
      createSuccessResponse(role, context.requestId)
    );
  }

  /**
   * Update role (admin only)
   * PUT /api/v1/roles/:roleId
   */
  async updateRole(
    request: FastifyRequest<{ 
      Params: { roleId: string }; 
      Body: Partial<UpdateRoleRequest> 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { roleId } = request.params;
    const updatedBy = request.user?.id!;
    
    const role = await this.roleService.update(roleId, request.body, updatedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse(role, context.requestId)
    );
  }

  /**
   * Delete role (admin only)
   * DELETE /api/v1/roles/:roleId
   */
  async deleteRole(
    request: FastifyRequest<{ Params: { roleId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { roleId } = request.params;
    const deletedBy = request.user?.id!;
    
    await this.roleService.delete(roleId, deletedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse({ message: 'Role deleted successfully' }, context.requestId)
    );
  }

  /**
   * Get users with role
   * GET /api/v1/roles/:roleId/users
   */
  async getUsersWithRole(
    request: FastifyRequest<{ 
      Params: { roleId: string };
      Querystring: { page?: number; limit?: number } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { roleId } = request.params;
    const { page = 1, limit = 20 } = request.query;
    
    const users = await this.roleService.getUsersWithRole(roleId, { page, limit });
    
    return reply.code(200).send(
      createSuccessResponse(users, context.requestId)
    );
  }

  /**
   * Assign role to users (admin only)
   * POST /api/v1/roles/:roleId/assign
   */
  async assignRole(
    request: FastifyRequest<{ 
      Params: { roleId: string };
      Body: { userIds: string[] } 
    }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { roleId } = request.params;
    const { userIds } = request.body;
    const assignedBy = request.user?.id!;
    
    const count = await this.roleService.assignToUsers(roleId, userIds, assignedBy, context);
    
    return reply.code(200).send(
      createSuccessResponse(
        { message: `Role assigned to ${count} users successfully` }, 
        context.requestId
      )
    );
  }

  /**
   * Get available permissions
   * GET /api/v1/roles/permissions
   */
  async getAvailablePermissions(request: FastifyRequest, reply: FastifyReply) {
    const context = getRequestContext(request)!;
    
    const permissions = await this.roleService.getAvailablePermissions();
    
    return reply.code(200).send(
      createSuccessResponse(permissions, context.requestId)
    );
  }

  /**
   * Check role usage
   * GET /api/v1/roles/:roleId/usage
   */
  async checkRoleUsage(
    request: FastifyRequest<{ Params: { roleId: string } }>, 
    reply: FastifyReply
  ) {
    const context = getRequestContext(request)!;
    const { roleId } = request.params;
    
    const usage = await this.roleService.checkUsage(roleId);
    
    return reply.code(200).send(
      createSuccessResponse(usage, context.requestId)
    );
  }
}
