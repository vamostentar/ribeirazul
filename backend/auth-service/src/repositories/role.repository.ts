import type { PaginatedResponse, Pagination } from '@/types/common';
import { NotFoundError } from '@/types/common';
import { PrismaClient } from '@prisma/client';
import { Role } from '@/types/auth';

export class RoleRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find role by ID
   */
  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  /**
   * Find role by name
   */
  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  /**
   * Create new role
   */
  async create(data: {
    name: string;
    displayName: string;
    description?: string;
    permissions: string[];
    isActive?: boolean;
    createdBy?: string;
  }): Promise<Role> {
    return this.prisma.role.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: data.permissions,
        isActive: data.isActive ?? true,
        // createdBy removed (not in schema)
      },
    });
  }

  /**
   * Update role
   */
  async update(id: string, data: Partial<{
    name: string;
    displayName: string;
    description: string;
    permissions: string[];
    isActive: boolean;
  }>): Promise<Role> {
    const role = await this.prisma.role.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return role;
  }

  /**
   * Delete role
   */
  async delete(id: string): Promise<void> {
    await this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Get paginated roles list
   */
  async findMany(
    pagination: Pagination,
    filters?: {
      isActive?: boolean;
    }
  ): Promise<PaginatedResponse<Role>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Get total count and data
    const [total, roles] = await Promise.all([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data: roles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get all roles
   */
  async findAll(isActive?: boolean): Promise<Role[]> {
    const where = isActive !== undefined ? { isActive } : {};
    
    return this.prisma.role.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get user count for role
   */
  async getUserCount(roleId: string): Promise<number> {
    return this.prisma.user.count({
      where: { roleId },
    });
  }

  /**
   * Check if role exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.role.count({
      where: { id },
    });
    
    return count > 0;
  }

  /**
   * Check if role name exists
   */
  async nameExists(name: string, excludeRoleId?: string): Promise<boolean> {
    const where: any = { name };
    
    if (excludeRoleId) {
      where.id = { not: excludeRoleId };
    }

    const count = await this.prisma.role.count({ where });
    return count > 0;
  }

  /**
   * Get role statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    withUsers: number;
    empty: number;
  }> {
    const [total, active, rolesWithUsers] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isActive: true } }),
      this.prisma.role.findMany({
        where: {
          users: {
            some: {},
          },
        },
        select: { id: true },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      withUsers: rolesWithUsers.length,
      empty: total - rolesWithUsers.length,
    };
  }
}
