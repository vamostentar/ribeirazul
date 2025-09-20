import { RoleRepository } from '@/repositories/role.repository';
import { UserRepository } from '@/repositories/user.repository';
import type { CreateRoleRequest, UpdateRoleRequest } from '@/types/auth';
import type { PaginatedResponse, Pagination, RequestContext } from '@/types/common';
import { ConflictError, NotFoundError, ValidationError } from '@/types/common';
import { logHelpers } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

// Available permissions in the system
export const AVAILABLE_PERMISSIONS = [
  // User management
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'users.activate',
  'users.deactivate',
  
  // Role management
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  
  // Session management
  'sessions.read',
  'sessions.terminate',
  'sessions.manage_all',
  
  // Audit logs
  'audit_logs.read',
  'audit_logs.export',
  
  // Settings
  'settings.read',
  'settings.update',
  
  // Analytics
  'analytics.read',
  'analytics.export',
  
  // System
  'system.health.read',
  'system.maintenance',
  
  // API Keys
  'api_keys.read',
  'api_keys.create',
  'api_keys.revoke',
];

export class RoleService {
  private _roleRepository?: RoleRepository;
  private _userRepository?: UserRepository;

  constructor(private prisma: PrismaClient) {
    // Dependencies are initialized lazily
  }

  private get roleRepository(): RoleRepository {
    if (!this._roleRepository) {
      this._roleRepository = new RoleRepository(this.prisma);
    }
    return this._roleRepository;
  }

  private get userRepository(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new UserRepository(this.prisma);
    }
    return this._userRepository;
  }

  /**
   * Find role by ID
   */
  async findById(id: string) {
    const role = await this.roleRepository.findById(id);
    
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    
    return role;
  }

  /**
   * Find many roles with pagination
   */
  async findMany(
    pagination: Pagination,
    filters?: {
      isActive?: boolean;
    }
  ): Promise<PaginatedResponse<any>> {
    return this.roleRepository.findMany(pagination, filters);
  }

  /**
   * Create new role
   */
  async create(
    data: CreateRoleRequest, 
    createdBy: string, 
    context: RequestContext
  ) {
    // Check if role name already exists
    const existingRole = await this.roleRepository.findByName(data.name);
    if (existingRole) {
      throw new ConflictError('Role name already exists');
    }

    // Validate permissions
    const invalidPermissions = data.permissions.filter((p: string) => p !== '*' && !AVAILABLE_PERMISSIONS.includes(p));
    
    if (invalidPermissions.length > 0) {
      throw new ValidationError(
        `Invalid permissions: ${invalidPermissions.join(', ')}`
      );
    }

    // Create role
    const role = await this.roleRepository.create({
      ...data,
      createdBy,
    });

    // Log role creation
    logHelpers.roleCreated(role.id, role.name, createdBy, context);

    return role;
  }

  /**
   * Update role
   */
  async update(
    id: string, 
    data: Partial<UpdateRoleRequest>, 
    updatedBy: string, 
    context: RequestContext
  ) {
    const existingRole = await this.roleRepository.findById(id);
    if (!existingRole) {
      throw new NotFoundError('Role not found');
    }

    // Prevent updating system roles
    if (this.isSystemRole(existingRole.name)) {
      throw new ValidationError('System roles cannot be updated');
    }

    // Check name uniqueness if updating
    if (data.name && data.name !== existingRole.name) {
      const roleWithName = await this.roleRepository.findByName(data.name);
      if (roleWithName) {
        throw new ConflictError('Role name already exists');
      }
    }

    // Validate permissions if updating
    if (data.permissions) {
      const invalidPermissions = data.permissions.filter((p: string) => p !== '*' && !AVAILABLE_PERMISSIONS.includes(p));
      
      if (invalidPermissions.length > 0) {
        throw new ValidationError(
          `Invalid permissions: ${invalidPermissions.join(', ')}`
        );
      }
    }

    // Update role
    const role = await this.roleRepository.update(id, data);

    // Log role update
    logHelpers.roleUpdated(role.id, role.name, updatedBy, data, context);

    return role;
  }

  /**
   * Delete role
   */
  async delete(id: string, deletedBy: string, context: RequestContext) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Prevent deleting system roles
    if (this.isSystemRole(role.name)) {
      throw new ValidationError('System roles cannot be deleted');
    }

    // Check if role is in use
    const userCount = await this.roleRepository.getUserCount(id);
    if (userCount > 0) {
      throw new ConflictError(
        `Cannot delete role. ${userCount} users are assigned to this role.`
      );
    }

    await this.roleRepository.delete(id);

    // Log role deletion
    logHelpers.roleUpdated(
      role.id, 
      role.name, 
      deletedBy, 
      { deleted: true }, 
      context
    );
  }

  /**
   * Get users with role
   */
  async getUsersWithRole(
    roleId: string, 
    pagination?: { page: number; limit: number }
  ) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const users = await this.userRepository.findByRole(roleId);
    
    // Simple pagination if requested
    if (pagination) {
      const { page, limit } = pagination;
      const start = (page - 1) * limit;
      const paginatedUsers = users.slice(start, start + limit);
      
      return {
        data: paginatedUsers.map(user => this.sanitizeUser(user)),
        pagination: {
          page,
          limit,
          total: users.length,
          totalPages: Math.ceil(users.length / limit),
          hasNext: page * limit < users.length,
          hasPrev: page > 1,
        },
      };
    }

    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Assign role to multiple users
   */
  async assignToUsers(
    roleId: string, 
    userIds: string[], 
    assignedBy: string, 
    context: RequestContext
  ): Promise<number> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    let count = 0;
    
    for (const userId of userIds) {
      try {
        const user = await this.userRepository.findById(userId);
        if (user && user.roleId !== roleId) {
          await this.userRepository.update(userId, { roleId });
          count++;
          
          // Log role assignment
          logHelpers.userUpdated(
            userId, 
            assignedBy, 
            { roleId, roleName: role.name }, 
            context
          );
        }
      } catch (error) {
        // Continue with next user if one fails
        continue;
      }
    }

    return count;
  }

  /**
   * Get available permissions
   */
  async getAvailablePermissions() {
    return {
      permissions: AVAILABLE_PERMISSIONS,
      categories: {
        users: AVAILABLE_PERMISSIONS.filter(p => p.startsWith('users.')),
        roles: AVAILABLE_PERMISSIONS.filter(p => p.startsWith('roles.')),
        sessions: AVAILABLE_PERMISSIONS.filter(p => p.startsWith('sessions.')),
        audit_logs: AVAILABLE_PERMISSIONS.filter(p => p.startsWith('audit_logs.')),
        settings: AVAILABLE_PERMISSIONS.filter(p => p.startsWith('settings.')),
        analytics: AVAILABLE_PERMISSIONS.filter(p => p.startsWith('analytics.')),
        system: AVAILABLE_PERMISSIONS.filter(p => p.startsWith('system.')),
        api_keys: AVAILABLE_PERMISSIONS.filter(p => p.startsWith('api_keys.')),
      },
    };
  }

  /**
   * Check role usage
   */
  async checkUsage(roleId: string) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const userCount = await this.roleRepository.getUserCount(roleId);
    
    return {
      role,
      userCount,
      isSystemRole: this.isSystemRole(role.name),
      canDelete: !this.isSystemRole(role.name) && userCount === 0,
    };
  }

  /**
   * Check if role is a system role
   */
  private isSystemRole(roleName: string): boolean {
    const systemRoles = ['super_admin', 'admin'];
    return systemRoles.includes(roleName);
  }

  /**
   * Sanitize user data
   */
  private sanitizeUser(user: any) {
    const { 
      password, 
      twoFactorSecret, 
      twoFactorBackupCodes, 
      ...safeUser 
    } = user;
    
    return safeUser;
  }
}
