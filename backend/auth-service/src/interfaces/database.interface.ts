import { JWTPayload, RefreshTokenRequest, TokenPair, User, Role, Session, RefreshToken, LoginAttempt, AuditLog, ApiKey } from '@/types/auth';

/**
 * Interface para abstração de banco de dados
 * Permite trocar implementações (Prisma, TypeORM, etc.) sem afetar o código de negócio
 */
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;

  // Transaction support
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;

  // User operations
  users: UserRepositoryInterface;

  // Role operations
  roles: RoleRepositoryInterface;

  // Session operations
  sessions: SessionRepositoryInterface;

  // Audit operations
  audit: AuditRepositoryInterface;

  // API Key operations
  apiKeys: ApiKeyRepositoryInterface;
}

/**
 * Interface para transações de banco de dados
 */
export interface DatabaseTransaction {
  // User operations
  users: UserRepositoryInterface;

  // Role operations
  roles: RoleRepositoryInterface;

  // Session operations
  sessions: SessionRepositoryInterface;

  // Audit operations
  audit: AuditRepositoryInterface;

  // API Key operations
  apiKeys: ApiKeyRepositoryInterface;
}

/**
 * Interface para repositório de usuários
 */
export interface UserRepositoryInterface {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(data: Partial<User>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  findMany(options: FindManyOptions): Promise<User[]>;
  updatePassword(id: string, hashedPassword: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
  verifyEmail(id: string): Promise<void>;
  enableTwoFactor(id: string, secret: string, backupCodes: string[]): Promise<void>;
  disableTwoFactor(id: string): Promise<void>;
  useBackupCode(id: string, code: string): Promise<boolean>;
  emailExists(email: string, excludeUserId?: string): Promise<boolean>;
  usernameExists(username: string, excludeUserId?: string): Promise<boolean>;
}

/**
 * Interface para repositório de roles
 */
export interface RoleRepositoryInterface {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(data: Partial<Role>): Promise<Role>;
  update(id: string, data: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<void>;
  findMany(options: FindManyOptions): Promise<Role[]>;
  getUserCount(roleId: string): Promise<number>;
}

/**
 * Interface para repositório de sessões
 */
export interface SessionRepositoryInterface {
  findById(id: string): Promise<Session | null>;
  findByToken(token: string): Promise<Session | null>;
  findByUserId(userId: string, options?: FindManyOptions): Promise<Session[]>;
  findActiveByUserId(userId: string): Promise<Session[]>;
  create(data: Partial<Session>): Promise<Session>;
  updateActivity(sessionToken: string): Promise<void>;
  deactivate(sessionToken: string): Promise<void>;
  deactivateById(sessionId: string): Promise<void>;
  deactivateAllForUser(userId: string, exceptToken?: string): Promise<number>;
  deleteExpired(): Promise<number>;
  findSuspiciousSessions(userId: string): Promise<Session[]>;
}

/**
 * Interface para repositório de refresh tokens
 */
export interface RefreshTokenRepositoryInterface {
  findById(id: string): Promise<RefreshToken | null>;
  findByToken(token: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  create(data: Partial<RefreshToken>): Promise<RefreshToken>;
  revoke(token: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  revokeById(id: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

/**
 * Interface para repositório de audit logs
 */
export interface AuditRepositoryInterface {
  create(data: Partial<AuditLog>): Promise<AuditLog>;
  findMany(options: FindManyOptions): Promise<AuditLog[]>;
  findByUserId(userId: string, options?: FindManyOptions): Promise<AuditLog[]>;
  findByResource(resource: string, resourceId: string, options?: FindManyOptions): Promise<AuditLog[]>;
  count(options: FindManyOptions): Promise<number>;
}

/**
 * Interface para repositório de API keys
 */
export interface ApiKeyRepositoryInterface {
  findById(id: string): Promise<ApiKey | null>;
  findByKeyHash(keyHash: string): Promise<ApiKey | null>;
  findByName(name: string): Promise<ApiKey | null>;
  create(data: Partial<ApiKey>): Promise<ApiKey>;
  update(id: string, data: Partial<ApiKey>): Promise<ApiKey>;
  delete(id: string): Promise<void>;
  findMany(options: FindManyOptions): Promise<ApiKey[]>;
  updateUsage(id: string): Promise<void>;
  findExpired(): Promise<ApiKey[]>;
}

/**
 * Interface para opções de busca
 */
export interface FindManyOptions {
  skip?: number;
  take?: number;
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, boolean>;
}

/**
 * Interface para repositório de login attempts
 */
export interface LoginAttemptRepositoryInterface {
  create(data: Partial<LoginAttempt>): Promise<LoginAttempt>;
  findByEmail(email: string, options?: FindManyOptions): Promise<LoginAttempt[]>;
  findByUserId(userId: string, options?: FindManyOptions): Promise<LoginAttempt[]>;
  count(options: FindManyOptions): Promise<number>;
  deleteOldEntries(olderThan: Date): Promise<number>;
}
