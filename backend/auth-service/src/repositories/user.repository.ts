import type { CreateUserRequest, UpdateUserRequest } from '@/types/auth';
import { Role, User } from '@/types/auth';
import type { PaginatedResponse, Pagination } from '@/types/common';
import { NotFoundError } from '@/types/common';
import { PrismaClient } from '@prisma/client';

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<(User & { role: Role }) | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<(User & { role: Role }) | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<(User & { role: Role }) | null> {
    return this.prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });
  }

  /**
   * Create new user
   */
  async create(data: CreateUserRequest & { password: string }): Promise<User & { role: Role }> {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        phone: data.phone,
        roleId: data.roleId,
        isActive: data.isActive,
      },
      include: { role: true },
    });
  }

  /**
   * Update user
   */
  async update(id: string, data: Partial<UpdateUserRequest>): Promise<User & { role: Role }> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Hard delete user (permanent)
   */
  async hardDelete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Get paginated users list
   */
  async findMany(pagination: Pagination, filters?: {
    search?: string;
    roleId?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<User & { role: Role }>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.roleId) {
      where.roleId = filters.roleId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Get total count and data
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { role: true },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data: users,
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
   * Update password
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(id: string, secret: string, backupCodes: string[]): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Use backup code
   */
  async useBackupCode(id: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { twoFactorBackupCodes: true },
    });

    if (!user || !user.twoFactorBackupCodes.includes(code)) {
      return false;
    }

    // Remove used backup code
    const updatedCodes = user.twoFactorBackupCodes.filter((c: string) => c !== code);
    
    await this.prisma.user.update({
      where: { id },
      data: {
        twoFactorBackupCodes: updatedCodes,
        updatedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
    withTwoFactor: number;
    recentLogins: number; // Last 24 hours
  }> {
    const [
      total,
      active,
      verified,
      withTwoFactor,
      recentLogins,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isEmailVerified: true } }),
      this.prisma.user.count({ where: { twoFactorEnabled: true } }),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      verified,
      unverified: total - verified,
      withTwoFactor,
      recentLogins,
    };
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const where: any = { email: email.toLowerCase() };
    
    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    const count = await this.prisma.user.count({ where });
    return count > 0;
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    const where: any = { username };
    
    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    const count = await this.prisma.user.count({ where });
    return count > 0;
  }

  /**
   * Get users by role
   */
  async findByRole(roleId: string): Promise<(User & { role: Role })[]> {
    return this.prisma.user.findMany({
      where: { roleId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get recently created users
   */
  async getRecentUsers(limit: number = 10): Promise<(User & { role: Role })[]> {
    return this.prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Search users
   */
  async search(query: string, limit: number = 20): Promise<(User & { role: Role })[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { role: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find users by IDs
   */
  async findByIds(ids: string[]): Promise<(User & { role: Role })[]> {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      include: { role: true },
    });
  }
}
