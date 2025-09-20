import { z } from 'zod';
import { EmailSchema, PasswordSchema, PhoneSchema, UUIDSchema } from './common';

// =====================================================
// USER TYPES
// =====================================================

export interface User {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  roleId: string;
  role?: Role;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  role?: PublicRole;
  createdAt: Date;
}

// =====================================================
// ROLE TYPES
// =====================================================

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicRole {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  permissions: string[];
}

// =====================================================
// SESSION TYPES
// =====================================================

export interface Session {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  isActive: boolean;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
}

// =====================================================
// TOKEN TYPES
// =====================================================

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  isRevoked: boolean;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  family: string | null;
  replacedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export interface JWTPayload {
  sub: string;      // User ID
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
  iat: number;      // Issued at
  exp?: number;     // Expires at (optional when using expiresIn)
  iss: string;      // Issuer
  aud: string;      // Audience
  jti: string;      // JWT ID
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// =====================================================
// AUTHENTICATION SCHEMAS
// =====================================================

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  twoFactorCode: z.string().length(6, 'Two-factor code must be 6 digits').optional(),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).optional(),
  phone: PhoneSchema,
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;

// =====================================================
// TWO-FACTOR AUTHENTICATION
// =====================================================

export const Enable2FASchema = z.object({
  password: z.string().min(1, 'Current password is required'),
});

export type Enable2FARequest = z.infer<typeof Enable2FASchema>;

export const Verify2FASchema = z.object({
  token: z.string().length(6, 'Two-factor code must be 6 digits'),
  secret: z.string().min(1, 'Secret is required'),
});

export type Verify2FARequest = z.infer<typeof Verify2FASchema>;

export const Disable2FASchema = z.object({
  password: z.string().min(1, 'Current password is required'),
  token: z.string().length(6, 'Two-factor code must be 6 digits'),
});

export type Disable2FARequest = z.infer<typeof Disable2FASchema>;

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

// =====================================================
// USER MANAGEMENT SCHEMAS
// =====================================================

export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  username: z.string().min(3).max(30).optional(),
  phone: PhoneSchema,
  roleId: UUIDSchema,
  isActive: z.boolean().default(true),
  sendWelcomeEmail: z.boolean().default(true),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  username: z.string().min(3).max(30).optional(),
  phone: PhoneSchema,
  avatar: z.string().url().optional(),
  roleId: UUIDSchema.optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  username: z.string().min(3).max(30).optional(),
  phone: PhoneSchema,
  avatar: z.string().url().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;

// =====================================================
// ROLE MANAGEMENT SCHEMAS
// =====================================================

export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  displayName: z.string().min(1, 'Display name is required').max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  isActive: z.boolean().default(true),
});

export type CreateRoleRequest = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRoleRequest = z.infer<typeof UpdateRoleSchema>;

// =====================================================
// API KEY TYPES
// =====================================================

export interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  permissions: string[];
  scopes: string[];
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
  expiresAt?: Date;
  rateLimit?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  scopes: z.array(z.string()).optional().default([]),
  expiresAt: z.string().datetime().optional(),
  rateLimit: z.number().positive().optional(),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeySchema>;

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // Full API key (only returned once)
  keyPreview: string;
  permissions: string[];
  scopes: string[];
  expiresAt?: Date;
  rateLimit?: number;
  createdAt: Date;
}

// =====================================================
// LOGIN ATTEMPT TYPES
// =====================================================

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  userId?: string;
  failureReason?: string;
  createdAt: Date;
}

export enum LoginFailureReason {
  INVALID_CREDENTIALS = 'invalid_credentials',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_DISABLED = 'account_disabled',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
  INVALID_2FA = 'invalid_2fa',
  EXPIRED_2FA = 'expired_2fa',
  RATE_LIMITED = 'rate_limited',
}

// =====================================================
// AUTH RESPONSE TYPES
// =====================================================

export interface LoginResponse {
  user: PublicUser;
  tokens: TokenPair;
  requiresTwoFactor?: boolean;
  tempToken?: string; // For 2FA flow
}

export interface RefreshResponse {
  tokens: TokenPair;
}

export interface ProfileResponse {
  user: PublicUser;
}

export interface SessionsResponse {
  sessions: PublicSession[];
}

// =====================================================
// VALIDATION TYPES
// =====================================================

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-100
}

export interface EmailValidation {
  isValid: boolean;
  isDisposable: boolean;
  domain: string;
  suggestion?: string;
}

// =====================================================
// SECURITY TYPES
// =====================================================

export interface SecurityEvent {
  type: 'login' | 'logout' | 'password_change' | '2fa_enabled' | '2fa_disabled' | 'suspicious_activity';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  location?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AccountLockInfo {
  isLocked: boolean;
  lockedUntil?: Date;
  attempts: number;
  maxAttempts: number;
  lockoutDuration: number;
}

// =====================================================
// SETTINGS TYPES
// =====================================================

export interface AuthSettings {
  passwordMinLength: number;
  passwordRequireUpper: boolean;
  passwordRequireLower: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordHistoryCount: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  lockoutWindow: number;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  jwtAccessExpiry: number;
  jwtRefreshExpiry: number;
  twoFactorRequired: boolean;
  twoFactorGracePeriod: number;
  emailVerificationRequired: boolean;
  emailVerificationExpiry: number;
  passwordResetExpiry: number;
}

export const UpdateAuthSettingsSchema = z.object({
  passwordMinLength: z.number().min(6).max(128).optional(),
  passwordRequireUpper: z.boolean().optional(),
  passwordRequireLower: z.boolean().optional(),
  passwordRequireNumber: z.boolean().optional(),
  passwordRequireSymbol: z.boolean().optional(),
  passwordHistoryCount: z.number().min(0).max(50).optional(),
  maxLoginAttempts: z.number().min(1).max(20).optional(),
  lockoutDuration: z.number().min(60).max(86400).optional(), // 1 minute to 24 hours
  lockoutWindow: z.number().min(60).max(3600).optional(),    // 1 minute to 1 hour
  sessionTimeout: z.number().min(300).max(604800).optional(), // 5 minutes to 7 days
  maxConcurrentSessions: z.number().min(1).max(50).optional(),
  jwtAccessExpiry: z.number().min(300).max(86400).optional(), // 5 minutes to 24 hours
  jwtRefreshExpiry: z.number().min(3600).max(2592000).optional(), // 1 hour to 30 days
  twoFactorRequired: z.boolean().optional(),
  twoFactorGracePeriod: z.number().min(0).max(604800).optional(), // 0 to 7 days
  emailVerificationRequired: z.boolean().optional(),
  emailVerificationExpiry: z.number().min(300).max(604800).optional(), // 5 minutes to 7 days
  passwordResetExpiry: z.number().min(300).max(86400).optional(), // 5 minutes to 24 hours
});

export type UpdateAuthSettingsRequest = z.infer<typeof UpdateAuthSettingsSchema>;

// =====================================================
// QUERY TYPES
// =====================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const UserListQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type UserListQuery = z.infer<typeof UserListQuerySchema>;

export const RoleListQuerySchema = PaginationSchema.extend({
  isActive: z.coerce.boolean().optional(),
});

export type RoleListQuery = z.infer<typeof RoleListQuerySchema>;

// =====================================================
// AUDIT LOG TYPES
// =====================================================

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

// Export lowercase versions for compatibility
export const loginSchema = LoginSchema;
export const refreshTokenSchema = RefreshTokenSchema;
export const changePasswordSchema = ChangePasswordSchema;
export const twoFactorAuthSchema = Verify2FASchema;
