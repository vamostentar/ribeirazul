import { RoleRepository } from '@/repositories/role.repository';
import { UserRepository } from '@/repositories/user.repository';
import type { CreateUserRequest, UpdateUserRequest } from '@/types/auth';
import type { PaginatedResponse, Pagination, RequestContext } from '@/types/common';
import { ConflictError, NotFoundError, ValidationError } from '@/types/common';
import { hashPassword } from '@/utils/crypto';
import { logHelpers } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

export class UserService {
  private _userRepository?: UserRepository;
  private _roleRepository?: RoleRepository;

  constructor(private prisma: PrismaClient) {
    // Dependencies are initialized lazily
  }

  private get userRepository(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new UserRepository(this.prisma);
    }
    return this._userRepository;
  }

  private get roleRepository(): RoleRepository {
    if (!this._roleRepository) {
      this._roleRepository = new RoleRepository(this.prisma);
    }
    return this._roleRepository;
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    return this.sanitizeUser(user);
  }

  /**
   * Find many users with pagination
   */
  async findMany(
    pagination: Pagination,
    filters?: {
      search?: string;
      roleId?: string;
      isActive?: boolean;
    }
  ): Promise<PaginatedResponse<any>> {
    const result = await this.userRepository.findMany(pagination, filters);
    
    return {
      data: result.data.map(user => this.sanitizeUser(user)),
      pagination: result.pagination,
    };
  }

  /**
   * Create new user
   */
  async create(
    data: CreateUserRequest, 
    createdBy: string, 
    context: RequestContext
  ) {
    // Validate role exists
    if (data.roleId) {
      const role = await this.roleRepository.findById(data.roleId);
      if (!role) {
        throw new ValidationError('Invalid role ID');
      }
    }

    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(data.email);
    if (emailExists) {
      throw new ConflictError('Email already exists');
    }

    // Check if username already exists
    if (data.username) {
      const usernameExists = await this.userRepository.usernameExists(data.username);
      if (usernameExists) {
        throw new ConflictError('Username already exists');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    // Log user creation
    logHelpers.userCreated(user.id, createdBy, context);

    return this.sanitizeUser(user);
  }

  /**
   * Update user
   */
  async update(
    id: string, 
    data: Partial<UpdateUserRequest>, 
    context: RequestContext,
    updatedBy?: string
  ) {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Validate role if updating
    if (data.roleId) {
      const role = await this.roleRepository.findById(data.roleId);
      if (!role) {
        throw new ValidationError('Invalid role ID');
      }
    }

    // Check email uniqueness if updating
    if ((data as any).email && (data as any).email !== existingUser.email) {
      const emailExists = await this.userRepository.emailExists((data as any).email, id);
      if (emailExists) {
        throw new ConflictError('Email already exists');
      }
    }

    // Check username uniqueness if updating
    if (data.username && data.username !== existingUser.username) {
      const usernameExists = await this.userRepository.usernameExists(data.username, id);
      if (usernameExists) {
        throw new ConflictError('Username already exists');
      }
    }

    // Remove password from update data (use changePassword method instead)
    const { password: _, ...updateData } = data as any;

    // Update user
    const user = await this.userRepository.update(id, updateData);

    // Log update if updatedBy is provided
    if (updatedBy) {
      logHelpers.userUpdated(user.id, updatedBy, updateData, context);
    }

    return this.sanitizeUser(user);
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string, deletedBy: string, context: RequestContext) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepository.delete(id);

    // Log deletion
    logHelpers.userDeleted(id, deletedBy, context);
  }

  /**
   * Activate user
   */
  async activate(id: string, activatedBy: string, context: RequestContext) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isActive) {
      throw new ValidationError('User is already active');
    }

    const updatedUser = await this.userRepository.update(id, { isActive: true });

    // Log activation
    logHelpers.userUpdated(id, activatedBy, { isActive: true }, context);

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Deactivate user
   */
  async deactivate(id: string, deactivatedBy: string, context: RequestContext) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isActive) {
      throw new ValidationError('User is already inactive');
    }

    const updatedUser = await this.userRepository.update(id, { isActive: false });

    // Log deactivation
    logHelpers.userUpdated(id, deactivatedBy, { isActive: false }, context);

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Reset user password
   */
  async resetPassword(
    id: string, 
    newPassword: string, 
    resetBy: string, 
    context: RequestContext
  ) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.userRepository.updatePassword(id, hashedPassword);

    // Log password reset
    logHelpers.userUpdated(id, resetBy, { password: 'reset' }, context);
  }

  /**
   * Verify user email
   */
  async verifyEmail(id: string, verifiedBy: string, context: RequestContext) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isEmailVerified) {
      throw new ValidationError('Email is already verified');
    }

    await this.userRepository.verifyEmail(id);

    // Log email verification
    logHelpers.userUpdated(id, verifiedBy, { isEmailVerified: true }, context);
  }

  /**
   * Search users
   */
  async search(query: string, limit: number = 20) {
    const users = await this.userRepository.search(query, limit);
    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    return this.userRepository.getStatistics();
  }

  /**
   * Send communication to users
   */
  async sendCommunication(
    data: {
      type: 'email' | 'notification' | 'bulk_email';
      subject: string;
      message: string;
      userIds: string[];
      template?: string;
      sentBy: string;
    },
    context: RequestContext
  ) {
    const { type, subject, message, userIds, template, sentBy } = data;
    
    // Get users to send communication to
    const users = await this.userRepository.findByIds(userIds);
    
    if (users.length === 0) {
      throw new NotFoundError('No users found');
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Personalize message with user data
        const personalizedMessage = message.replace(
          '{name}', 
          user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.email.split('@')[0]
        );

        // Log communication attempt
        logHelpers.userUpdated(user.id, sentBy, {
          action: 'COMMUNICATION_SENT',
          type,
          subject,
          template,
          messageLength: personalizedMessage.length
        }, context);

        // TODO: Implement actual email/notification sending
        // For now, we'll just log the communication
        console.log(`📧 Sending ${type} to ${user.email}: ${subject}`);
        
        sentCount++;
      } catch (error) {
        errors.push(`Failed to send to ${user.email}: ${error}`);
      }
    }

    return {
      message: `Communication sent to ${sentCount} users`,
      sentCount,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Bulk import users
   */
  async bulkImportUsers(
    users: Array<{
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role: string;
      isActive: boolean;
      isVerified: boolean;
    }>,
    importedBy: string,
    context: RequestContext
  ) {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userData of users) {
      try {
        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(userData.email);
        if (existingUser) {
          errors.push(`User with email ${userData.email} already exists`);
          failed++;
          continue;
        }

        // Get role ID based on role name
        const role = await this.roleRepository.findByName(userData.role);
        if (!role) {
          errors.push(`Invalid role ${userData.role} for user ${userData.email}`);
          failed++;
          continue;
        }

        // Create user
        const hashedPassword = await hashPassword('TempPassword123!'); // Default password for imported users
        
        await this.userRepository.create({
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone || '',
          roleId: role.id,
          isActive: userData.isActive,
          sendWelcomeEmail: false, // Don't send welcome email for imported users
        });

        // Log user creation
        logHelpers.userCreated(userData.email, importedBy, context);

        imported++;
      } catch (error) {
        errors.push(`Failed to import user ${userData.email}: ${error}`);
        failed++;
      }
    }

    return {
      imported,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get user audit logs
   */
  async getUserAuditLogs(userId: string, period: string = '7d', limit: number = 50) {
    // For now, return mock data
    // TODO: Implement actual audit log retrieval from database
    const mockLogs = [
      {
        id: '1',
        action: 'LOGIN',
        description: 'Login realizado com sucesso',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        metadata: {}
      },
      {
        id: '2',
        action: 'PROFILE_UPDATE',
        description: 'Perfil atualizado - telefone alterado',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        ipAddress: '192.168.1.100',
        metadata: { field: 'phone' }
      }
    ];

    return mockLogs.slice(0, limit);
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const role = await this.roleRepository.findById(user.roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // TODO: Implement actual permissions system
    // For now, return role-based permissions
    const rolePermissions: Record<string, string[]> = {
      'client': ['properties.read'],
      'agent': ['properties.read', 'properties.create', 'properties.update', 'analytics.read'],
      'admin': ['users.read', 'users.create', 'users.update', 'properties.read', 'properties.create', 'properties.update', 'analytics.read', 'analytics.export'],
      'super_admin': ['users.read', 'users.create', 'users.update', 'users.delete', 'properties.read', 'properties.create', 'properties.update', 'properties.delete', 'analytics.read', 'analytics.export', 'system.settings', 'system.audit']
    };

    const permissions = rolePermissions[role.name] || [];
    const customPermissions: string[] = []; // TODO: Implement custom permissions

    return {
      role: role.name,
      permissions,
      customPermissions
    };
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(
    userId: string, 
    permissions: string[], 
    updatedBy: string, 
    context: RequestContext
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // TODO: Implement actual permissions update
    // For now, just log the action
    logHelpers.userUpdated(userId, updatedBy, { 
      permissionsUpdated: true,
      newPermissions: permissions 
    }, context);

    return {
      message: 'Permissions updated successfully',
      permissions
    };
  }

  /**
   * Sanitize user data for public consumption
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
