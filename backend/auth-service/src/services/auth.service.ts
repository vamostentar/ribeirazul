import { config } from '@/config';
import { RefreshTokenRepository, SessionRepository } from '@/repositories/session.repository';
import { UserRepository } from '@/repositories/user.repository';
import type {
  ChangePasswordRequest,
  JWTPayload,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RefreshTokenRequest,
  RegisterRequest,
  TokenPair,
  TwoFactorSetup
} from '@/types/auth';
import type { RequestContext } from '@/types/common';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from '@/types/common';
import {
  generateBackupCodes,
  generateJTI,
  generateSecureToken,
  generateSessionToken,
  generateTOTPQRCode,
  generateTOTPSecret,
  hashPassword,
  verifyPassword,
  verifyTOTP
} from '@/utils/crypto';
import { logger, logHelpers } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

export class AuthService {
  private _userRepository?: UserRepository;
  private _sessionRepository?: SessionRepository;
  private _refreshTokenRepository?: RefreshTokenRepository;

  constructor(private prisma: PrismaClient) {
    // Dependencies are initialized lazily
  }

  private get userRepository(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new UserRepository(this.prisma);
    }
    return this._userRepository;
  }

  private get sessionRepository(): SessionRepository {
    if (!this._sessionRepository) {
      this._sessionRepository = new SessionRepository(this.prisma);
    }
    return this._sessionRepository;
  }

  private get refreshTokenRepository(): RefreshTokenRepository {
    if (!this._refreshTokenRepository) {
      this._refreshTokenRepository = new RefreshTokenRepository(this.prisma);
    }
    return this._refreshTokenRepository;
  }

  /**
   * User login with email/password
   */
  async login(
    credentials: LoginRequest, 
    context: RequestContext
  ): Promise<LoginResponse> {
    const { email, password, rememberMe, twoFactorCode } = credentials;

    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        logHelpers.loginFailed(email, 'user_not_found', context);
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check if account is active
      if (!user.isActive) {
        logHelpers.loginFailed(email, 'account_disabled', context);
        throw new UnauthorizedError('Account is disabled');
      }

      // Verify password
      const isValidPassword = await verifyPassword((user as any).password, password);
      if (!isValidPassword) {
        logHelpers.loginFailed(email, 'invalid_password', context);
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check if email verification is required
      if (config.emailConfig && !user.isEmailVerified) {
        logHelpers.loginFailed(email, 'email_not_verified', context);
        throw new UnauthorizedError('Email verification required');
      }

      // Handle two-factor authentication
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          // Return temporary token for 2FA completion
          const tempToken = this.generateTempToken(user.id);
          return {
            user: this.sanitizeUser(user),
            requiresTwoFactor: true,
            tempToken,
            tokens: {} as TokenPair, // Will be provided after 2FA
          };
        }

        // Verify 2FA code
        const isValid2FA = await this.verify2FA(user.id, twoFactorCode);
        if (!isValid2FA) {
          logHelpers.loginFailed(email, 'invalid_2fa', context);
          throw new UnauthorizedError('Invalid two-factor authentication code');
        }
      }

      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + config.securityConfig.sessionTimeout * 1000);
      
      const session = await this.sessionRepository.create({
        userId: user.id,
        sessionToken,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        expiresAt,
      });

      // Generate JWT tokens
      const tokens = await this.generateTokenPair(user, session.id, rememberMe, context);

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Log successful login
      logHelpers.loginSuccess(user.id, context);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };

    } catch (error) {
      if (error instanceof UnauthorizedError) {
        // Record failed login attempt
        await this.recordLoginAttempt(email, context, false, error.message);
      }
      throw error;
    }
  }

  /**
   * User registration
   */
  async register(
    userData: RegisterRequest, 
    context: RequestContext
  ): Promise<{ user: any; message: string }> {
    const { email, password, firstName, lastName, username, phone } = userData;

    try {
      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new ConflictError('Email already exists');
      }

      // Check if username already exists (if provided)
      if (username) {
        const existingUsername = await this.userRepository.findByUsername(username);
        if (existingUsername) {
          throw new ConflictError('Username already exists');
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Get default role (assuming there's a default role)
      let defaultRole = await this.prisma.role.findFirst({
        where: { name: 'user' } // or whatever the default role name is
      });

      if (!defaultRole) {
        // Create default role if it doesn't exist
        const newRole = await this.prisma.role.create({
          data: {
            name: 'user',
            displayName: 'User',
            description: 'Default user role',
            permissions: ['users.read', 'properties.read'],
            isActive: true,
          }
        });
        defaultRole = newRole;
      }

      // Create user
      const user = await this.userRepository.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username: username || undefined,
        phone,
        roleId: defaultRole.id,
        isActive: false, // New users start inactive until email verification
        sendWelcomeEmail: false, // Don't send welcome email for now
      });

      // Log user registration
      logHelpers.userCreated(user.id, 'system', context);

      return {
        user: this.sanitizeUser(user),
        message: 'User registered successfully. Please check your email for verification.'
      };

    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      logger.error({
        requestId: context.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      }, 'Registration failed');
      throw new ValidationError('Registration failed');
    }
  }

  /**
   * Complete two-factor authentication
   */
  async complete2FA(
    tempToken: string, 
    twoFactorCode: string, 
    context: RequestContext
  ): Promise<LoginResponse> {
    try {
      // Verify temp token
      const decoded = jwt.verify(tempToken, config.jwtConfig.secret) as any;
      if (decoded.type !== 'temp_2fa') {
        throw new UnauthorizedError('Invalid temporary token');
      }

      const user = await this.userRepository.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Verify 2FA code
      const isValid2FA = await this.verify2FA(user.id, twoFactorCode);
      if (!isValid2FA) {
        logHelpers.loginFailed(user.email, 'invalid_2fa', context);
        throw new UnauthorizedError('Invalid two-factor authentication code');
      }

      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + config.securityConfig.sessionTimeout * 1000);
      
      const session = await this.sessionRepository.create({
        userId: user.id,
        sessionToken,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        expiresAt,
      });

      // Generate JWT tokens
      const tokens = await this.generateTokenPair(user, session.id, false, context);

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Log successful login
      logHelpers.loginSuccess(user.id, context);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh JWT tokens
   */
  async refreshTokens(
    request: RefreshTokenRequest, 
    context: RequestContext
  ): Promise<RefreshResponse> {
    const { refreshToken } = request;

    try {
      // Find refresh token
      const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Get user
      const user = await this.userRepository.findById(storedToken.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Revoke old refresh token
      await this.refreshTokenRepository.revoke(refreshToken);

      // Find session
      const sessions = await this.sessionRepository.findActiveByUserId(user.id);
      const session = sessions[0]; // Use most recent active session

      if (!session) {
        throw new UnauthorizedError('No active session found');
      }

      // Generate new token pair
      const tokens = await this.generateTokenPair(user, session.id, false, context);

      logger.debug({
        requestId: context.requestId,
        userId: user.id,
      }, 'Tokens refreshed successfully');

      return { tokens };

    } catch (error) {
      logger.warn({
        requestId: context.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Token refresh failed');
      
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(sessionToken: string, context: RequestContext): Promise<void> {
    try {
      const session = await this.sessionRepository.findByToken(sessionToken);
      if (session) {
        // Deactivate session
        await this.sessionRepository.deactivate(sessionToken);

        // Revoke all refresh tokens for this session
        await this.refreshTokenRepository.revokeAllForUser(session.userId);

        logHelpers.logout(session.userId, context);
      }
    } catch (error) {
      logger.error({
        requestId: context.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Logout failed');
      
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string, 
    request: ChangePasswordRequest, 
    context: RequestContext
  ): Promise<void> {
    const { currentPassword, newPassword } = request;

    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isValidPassword = await verifyPassword((user as any).password, currentPassword);
      if (!isValidPassword) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await this.userRepository.updatePassword(userId, hashedPassword);

      // Revoke all sessions except current
      await this.sessionRepository.deactivateAllForUser(userId);
      await this.refreshTokenRepository.revokeAllForUser(userId);

      logger.info({
        requestId: context.requestId,
        userId,
      }, 'Password changed successfully');

    } catch (error) {
      logger.error({
        requestId: context.requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Password change failed');
      
      throw error;
    }
  }

  /**
   * Enable two-factor authentication
   */
  async enable2FA(userId: string, context: RequestContext): Promise<TwoFactorSetup> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.twoFactorEnabled) {
        throw new ConflictError('Two-factor authentication is already enabled');
      }

      // Generate TOTP secret
      const secret = generateTOTPSecret();
      const qrCode = generateTOTPQRCode(secret, user.email);
      const backupCodes = generateBackupCodes();

      // Store temporarily (user needs to verify before enabling)
      // In a real implementation, you'd store this in a temporary table or cache

      return {
        secret,
        qrCode,
        backupCodes,
      };

    } catch (error) {
      logger.error({
        requestId: context.requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Enable 2FA failed');
      
      throw error;
    }
  }

  /**
   * Verify and confirm 2FA setup
   */
  async confirm2FA(
    userId: string, 
    secret: string, 
    token: string, 
    context: RequestContext
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify TOTP token
      const isValid = verifyTOTP(token, secret);
      if (!isValid) {
        throw new ValidationError('Invalid authentication code');
      }

      // Enable 2FA for user
      const backupCodes = generateBackupCodes();
      await this.userRepository.enableTwoFactor(userId, secret, backupCodes);

      logger.info({
        requestId: context.requestId,
        userId,
      }, 'Two-factor authentication enabled');

    } catch (error) {
      logger.error({
        requestId: context.requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Confirm 2FA failed');
      
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disable2FA(
    userId: string, 
    password: string, 
    token: string, 
    context: RequestContext
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.twoFactorEnabled) {
        throw new ValidationError('Two-factor authentication is not enabled');
      }

      // Verify password
      const isValidPassword = await verifyPassword((user as any).password, password);
      if (!isValidPassword) {
        throw new UnauthorizedError('Password is incorrect');
      }

      // Verify 2FA token
      const isValid2FA = await this.verify2FA(userId, token);
      if (!isValid2FA) {
        throw new ValidationError('Invalid authentication code');
      }

      // Disable 2FA
      await this.userRepository.disableTwoFactor(userId);

      logger.info({
        requestId: context.requestId,
        userId,
      }, 'Two-factor authentication disabled');

    } catch (error) {
      logger.error({
        requestId: context.requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Disable 2FA failed');
      
      throw error;
    }
  }

  /**
   * Generate JWT token pair
   */
  private async generateTokenPair(
    user: any, 
    sessionId: string, 
    rememberMe: boolean = false,
    context?: RequestContext
  ): Promise<TokenPair> {
    const jti = generateJTI();
    const now = Math.floor(Date.now() / 1000);
    
    const accessTokenExpiry = rememberMe 
      ? config.jwtConfig.accessExpiry 
      : '1h';
    
    const refreshTokenExpiry = rememberMe 
      ? '30d' 
      : config.jwtConfig.refreshExpiry;

    // Access token payload
    const accessPayload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions,
      sessionId,
      iat: now,
      iss: config.jwtConfig.issuer,
      aud: config.jwtConfig.audience,
      jti,
    };

    // Generate tokens
    const accessToken = jwt.sign(accessPayload as any, config.jwtConfig.secret as any, { expiresIn: accessTokenExpiry } as any);

    const refreshTokenValue = generateSecureToken(64);
    const refreshTokenExpiresAt = new Date(
      Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
    );

    // Store refresh token
    await this.refreshTokenRepository.create({
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: refreshTokenExpiresAt,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: rememberMe ? 86400 : 3600,
      tokenType: 'Bearer',
    };
  }

  /**
   * Generate temporary token for 2FA
   */
  private generateTempToken(userId: string): string {
    return jwt.sign(
      {
        sub: userId,
        type: 'temp_2fa',
        iat: Math.floor(Date.now() / 1000),
      },
      config.jwtConfig.secret,
      { expiresIn: '10m' } // 10 minutes to complete 2FA
    );
  }

  /**
   * Verify 2FA code
   */
  private async verify2FA(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || !(user as any).twoFactorEnabled || !(user as any).twoFactorSecret) {
      return false;
    }

    // Try TOTP first
    if (verifyTOTP(code, (user as any).twoFactorSecret)) {
      return true;
    }

    // Try backup codes
    if ((user as any).twoFactorBackupCodes.includes(code)) {
      await this.userRepository.useBackupCode(userId, code);
      return true;
    }

    return false;
  }

  /**
   * Record login attempt
   */
  private async recordLoginAttempt(
    email: string, 
    context: RequestContext, 
    success: boolean, 
    failureReason?: string
  ): Promise<void> {
    try {
      await this.prisma.loginAttempt.create({
        data: {
          email: email.toLowerCase(),
          ipAddress: context.ipAddress || 'unknown',
          userAgent: context.userAgent,
          success,
          failureReason,
        },
      });
    } catch (error) {
      logger.error({
        requestId: context.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to record login attempt');
    }
  }

  /**
   * Sanitize user data for public consumption
   */
  private sanitizeUser(user: any) {
    const { password, twoFactorSecret, twoFactorBackupCodes, ...safeUser } = user;
    return safeUser;
  }
}
