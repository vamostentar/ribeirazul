import {
  ApiKeyRepositoryInterface,
  AuditRepositoryInterface,
  DatabaseConnection,
  DatabaseTransaction,
  FindManyOptions,
  LoginAttemptRepositoryInterface,
  RefreshTokenRepositoryInterface,
  RoleRepositoryInterface,
  SessionRepositoryInterface,
  UserRepositoryInterface
} from '@/interfaces/database.interface';
import { ApiKey, AuditLog, LoginAttempt, RefreshToken, Role, Session, User } from '@/types/auth';
import { PrismaClient } from '@prisma/client';

/**
 * Implementação da interface DatabaseConnection usando Prisma
 */
export class PrismaDatabase implements DatabaseConnection {
  constructor(private prisma: PrismaClient) {}

  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const transactionDb = new PrismaDatabase(tx as any);
      return callback(transactionDb as DatabaseTransaction);
    });
  }

  get users(): UserRepositoryInterface {
    return new PrismaUserRepository(this.prisma);
  }

  get roles(): RoleRepositoryInterface {
    return new PrismaRoleRepository(this.prisma);
  }

  get sessions(): SessionRepositoryInterface {
    return new PrismaSessionRepository(this.prisma);
  }

  get refreshTokens(): RefreshTokenRepositoryInterface {
    return new PrismaRefreshTokenRepository(this.prisma);
  }

  get audit(): AuditRepositoryInterface {
    return new PrismaAuditRepository(this.prisma);
  }

  get apiKeys(): ApiKeyRepositoryInterface {
    return new PrismaApiKeyRepository(this.prisma);
  }

  get loginAttempts(): LoginAttemptRepositoryInterface {
    return new PrismaLoginAttemptRepository(this.prisma);
  }
}

/**
 * Implementação do repositório de usuários usando Prisma
 */
class PrismaUserRepository implements UserRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    return user as User | null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });
    return user as User | null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });
    return user as User | null;
  }

  async create(data: Partial<User>): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email!.toLowerCase(),
        password: (data as any).password!,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        phone: data.phone,
        roleId: data.roleId!,
        isActive: data.isActive ?? true,
      },
      include: { role: true },
    });
    return user as User;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that are not undefined
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.username !== undefined) updateData.username = data.username;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isEmailVerified !== undefined) updateData.isEmailVerified = data.isEmailVerified;
    if (data.emailVerifiedAt !== undefined) updateData.emailVerifiedAt = data.emailVerifiedAt;
    if (data.lastLoginAt !== undefined) updateData.lastLoginAt = data.lastLoginAt;
    if (data.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = data.twoFactorEnabled;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.createdBy !== undefined) updateData.createdBy = data.createdBy;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
    return user as User;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async findMany(options: FindManyOptions): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy,
      include: { role: true },
    });
    return users as User[];
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

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

  async useBackupCode(id: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { twoFactorBackupCodes: true },
    });

    if (!user || !user.twoFactorBackupCodes.includes(code)) {
      return false;
    }

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

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const where: any = { email: email.toLowerCase() };

    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    const count = await this.prisma.user.count({ where });
    return count > 0;
  }

  async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    const where: any = { username };

    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    const count = await this.prisma.user.count({ where });
    return count > 0;
  }
}

/**
 * Implementação do repositório de roles usando Prisma
 */
class PrismaRoleRepository implements RoleRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
    }) as Promise<Role | null>;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
    }) as Promise<Role | null>;
  }

  async create(data: Partial<Role>): Promise<Role> {
    return this.prisma.role.create({
      data: {
        name: data.name!,
        displayName: data.displayName!,
        description: data.description,
        permissions: data.permissions!,
        isActive: data.isActive ?? true,
      },
    }) as Promise<Role>;
  }

  async update(id: string, data: Partial<Role>): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    }) as Promise<Role>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.role.delete({
      where: { id },
    });
  }

  async findMany(options: FindManyOptions): Promise<Role[]> {
    return this.prisma.role.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy,
    }) as Promise<Role[]>;
  }

  async getUserCount(roleId: string): Promise<number> {
    return this.prisma.user.count({
      where: { roleId },
    });
  }
}

/**
 * Implementação do repositório de sessões usando Prisma
 */
class PrismaSessionRepository implements SessionRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
    }) as Promise<Session | null>;
  }

  async findByToken(token: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { sessionToken: token },
    }) as Promise<Session | null>;
  }

  async findByUserId(userId: string, options?: FindManyOptions): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId, ...options?.where },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
    }) as Promise<Session[]>;
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    }) as Promise<Session[]>;
  }

  async create(data: Partial<Session>): Promise<Session> {
    return this.prisma.session.create({
      data: {
        userId: data.userId!,
        sessionToken: data.sessionToken!,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        location: data.location,
        expiresAt: data.expiresAt!,
      },
    }) as Promise<Session>;
  }

  async updateActivity(sessionToken: string): Promise<void> {
    await this.prisma.session.update({
      where: { sessionToken },
      data: {
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async deactivate(sessionToken: string): Promise<void> {
    await this.prisma.session.update({
      where: { sessionToken },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async deactivateById(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async deactivateAllForUser(userId: string, exceptToken?: string): Promise<number> {
    const where: any = { userId };

    if (exceptToken) {
      where.sessionToken = { not: exceptToken };
    }

    const result = await this.prisma.session.updateMany({
      where,
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { isActive: false },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });

    return result.count;
  }

  async findSuspiciousSessions(userId: string): Promise<Session[]> {
    // Implementação básica - pode ser expandida com lógica mais sofisticada
    return this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }) as Promise<Session[]>;
  }
}

/**
 * Implementação do repositório de refresh tokens usando Prisma
 */
class PrismaRefreshTokenRepository implements RefreshTokenRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { id },
    }) as Promise<RefreshToken | null>;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token },
    }) as Promise<RefreshToken | null>;
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: { userId },
    }) as Promise<RefreshToken[]>;
  }

  async create(data: Partial<RefreshToken>): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        token: data.token!,
        userId: data.userId!,
        expiresAt: data.expiresAt!,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        family: data.family,
      },
    }) as Promise<RefreshToken>;
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async revokeById(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { isRevoked: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });

    return result.count;
  }
}

/**
 * Implementação do repositório de audit logs usando Prisma
 */
class PrismaAuditRepository implements AuditRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async create(data: Partial<AuditLog>): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action!,
        resource: data.resource,
        resourceId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        endpoint: data.endpoint,
        method: data.method,
        oldValues: data.oldValues as any,
        newValues: data.newValues as any,
        metadata: data.metadata as any,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
      },
    }) as Promise<AuditLog>;
  }

  async findMany(options: FindManyOptions): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy,
    }) as Promise<AuditLog[]>;
  }

  async findByUserId(userId: string, options?: FindManyOptions): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { userId, ...options?.where },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
    }) as Promise<AuditLog[]>;
  }

  async findByResource(resource: string, resourceId: string, options?: FindManyOptions): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
        ...options?.where
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
    }) as Promise<AuditLog[]>;
  }

  async count(options: FindManyOptions): Promise<number> {
    return this.prisma.auditLog.count({
      where: options.where,
    });
  }
}

/**
 * Implementação do repositório de API keys usando Prisma
 */
class PrismaApiKeyRepository implements ApiKeyRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({
      where: { id },
    }) as Promise<ApiKey | null>;
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({
      where: { keyHash },
    }) as Promise<ApiKey | null>;
  }

  async findByName(name: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findFirst({
      where: { name },
    }) as Promise<ApiKey | null>;
  }

  async create(data: Partial<ApiKey>): Promise<ApiKey> {
    return this.prisma.apiKey.create({
      data: {
        name: data.name!,
        keyHash: (data as any).keyHash!,
        keyPreview: data.keyPreview!,
        permissions: data.permissions!,
        scopes: data.scopes ?? [],
        lastUsedAt: data.lastUsedAt,
        usageCount: data.usageCount ?? 0,
        isActive: data.isActive ?? true,
        expiresAt: data.expiresAt,
        rateLimit: data.rateLimit,
        createdBy: data.createdBy,
      },
    }) as Promise<ApiKey>;
  }

  async update(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    }) as Promise<ApiKey>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.apiKey.delete({
      where: { id },
    });
  }

  async findMany(options: FindManyOptions): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy,
    }) as Promise<ApiKey[]>;
  }

  async updateUsage(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  async findExpired(): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
    }) as Promise<ApiKey[]>;
  }
}

/**
 * Implementação do repositório de login attempts usando Prisma
 */
class PrismaLoginAttemptRepository implements LoginAttemptRepositoryInterface {
  constructor(private prisma: PrismaClient) {}

  async create(data: Partial<LoginAttempt>): Promise<LoginAttempt> {
    return this.prisma.loginAttempt.create({
      data: {
        email: data.email!,
        ipAddress: data.ipAddress!,
        userAgent: data.userAgent,
        success: data.success ?? false,
        userId: data.userId,
        failureReason: data.failureReason,
      },
    }) as Promise<LoginAttempt>;
  }

  async findByEmail(email: string, options?: FindManyOptions): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { email, ...options?.where },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
    }) as Promise<LoginAttempt[]>;
  }

  async findByUserId(userId: string, options?: FindManyOptions): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { userId, ...options?.where },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
    }) as Promise<LoginAttempt[]>;
  }

  async count(options: FindManyOptions): Promise<number> {
    return this.prisma.loginAttempt.count({
      where: options.where,
    });
  }

  async deleteOldEntries(olderThan: Date): Promise<number> {
    const result = await this.prisma.loginAttempt.deleteMany({
      where: {
        createdAt: { lt: olderThan },
      },
    });

    return result.count;
  }
}
