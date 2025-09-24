-- Ensure auth schema exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Users
CREATE TABLE IF NOT EXISTS "auth"."users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "password" TEXT NOT NULL,
  "phone" TEXT,
  "avatar" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerifiedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorSecret" TEXT,
  "twoFactorBackupCodes" TEXT[],
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Roles
CREATE TABLE IF NOT EXISTS "auth"."roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Sessions
CREATE TABLE IF NOT EXISTS "auth"."sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "location" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isRevoked" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "family" TEXT,
  "replacedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Login Attempts
CREATE TABLE IF NOT EXISTS "auth"."login_attempts" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL,
  "userId" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- Token Blacklist
CREATE TABLE IF NOT EXISTS "auth"."token_blacklist" (
  "id" TEXT NOT NULL,
  "jti" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT,
  "reason" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- Password Resets
CREATE TABLE IF NOT EXISTS "auth"."password_resets" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "isUsed" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- Email Verifications
CREATE TABLE IF NOT EXISTS "auth"."email_verifications" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "isUsed" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS "auth"."audit_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT,
  "resourceId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "endpoint" TEXT,
  "method" TEXT,
  "oldValues" JSONB,
  "newValues" JSONB,
  "metadata" JSONB,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- API Keys
CREATE TABLE IF NOT EXISTS "auth"."api_keys" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "keyPreview" TEXT NOT NULL,
  "permissions" TEXT[],
  "scopes" TEXT[],
  "lastUsedAt" TIMESTAMP(3),
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "rateLimit" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "auth"."users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "auth"."users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "auth"."roles"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "auth"."sessions"("sessionToken");
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_key" ON "auth"."refresh_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "token_blacklist_jti_key" ON "auth"."token_blacklist"("jti");
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_token_key" ON "auth"."password_resets"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "email_verifications_token_key" ON "auth"."email_verifications"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyHash_key" ON "auth"."api_keys"("keyHash");

-- Foreign keys
ALTER TABLE "auth"."users"
  ADD CONSTRAINT IF NOT EXISTS "users_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "auth"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auth"."sessions"
  ADD CONSTRAINT IF NOT EXISTS "sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."refresh_tokens"
  ADD CONSTRAINT IF NOT EXISTS "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."login_attempts"
  ADD CONSTRAINT IF NOT EXISTS "login_attempts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "auth"."audit_logs"
  ADD CONSTRAINT IF NOT EXISTS "audit_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


