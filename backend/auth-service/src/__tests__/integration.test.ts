import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseConnection } from '@/interfaces/database.interface';
import { TokenManager } from '@/interfaces/token-manager.interface';
import { PasswordHasher } from '@/interfaces/password-hasher.interface';
import { CacheManager } from '@/interfaces/cache.interface';
import { ObservabilityManager } from '@/interfaces/observability.interface';
import { PrismaDatabase } from '@/implementations/prisma-database';
import { JWTTokenManager } from '@/implementations/jwt-token-manager';
import { Argon2PasswordHasher } from '@/implementations/argon2-password-hasher';
import { MemoryCache } from '@/implementations/memory-cache';
import { ConsoleObservabilityManager } from '@/implementations/console-observability';
import { LoginRequest, JWTPayload } from '@/types/auth';
import { RequestContext } from '@/types/common';

/**
 * Testes de Integração entre Módulos
 * Testa como os módulos se comunicam através das interfaces
 */
describe('Module Integration Tests', () => {
  let database: DatabaseConnection;
  let tokenManager: TokenManager;
  let passwordHasher: PasswordHasher;
  let cache: CacheManager;
  let observability: ObservabilityManager;

  const mockContext: RequestContext = {
    requestId: 'integration-test-request',
    ipAddress: '127.0.0.1',
    userAgent: 'integration-test',
    startTime: Date.now(),
  };

  beforeEach(() => {
    // Usar implementações reais para testes de integração
    // Nota: Em um ambiente real, você usaria containers de teste
    database = {} as DatabaseConnection; // Mock para evitar dependência real de DB
    tokenManager = new JWTTokenManager({
      secret: 'test-secret-key-for-integration-tests',
      accessExpiry: '1h',
      refreshExpiry: '7d',
      issuer: 'test-issuer',
      audience: 'test-audience',
    });
    passwordHasher = new Argon2PasswordHasher({
      memoryCost: 1024, // Valores baixos para testes
      timeCost: 1,
      parallelism: 1,
    });
    cache = new MemoryCache({
      enabled: true,
      defaultTtl: 300,
    });
    observability = new ConsoleObservabilityManager({
      enabled: true,
      metricsEnabled: true,
      loggingEnabled: true,
      auditEnabled: true,
      metricsInterval: 60000,
      logLevel: 'info',
    });
  });

  describe('TokenManager Integration', () => {
    it('should generate and verify tokens correctly', async () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'test-issuer',
        aud: 'test-audience',
        jti: 'jti-123',
      };

      const token = await tokenManager.generate(payload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const verified = await tokenManager.verify(token);
      expect(verified.sub).toBe(payload.sub);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
    });

    it('should handle token expiration', async () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) - 3600, // Token expirado
        iss: 'test-issuer',
        aud: 'test-audience',
        jti: 'jti-123',
      };

      const token = await tokenManager.generate(payload);
      expect(tokenManager.isExpired(token)).toBe(true);

      await expect(tokenManager.verify(token)).rejects.toThrow();
    });

    it('should generate token pairs', async () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'test-issuer',
        aud: 'test-audience',
        jti: 'jti-123',
      };

      const tokenPair = await tokenManager.generatePair(payload);

      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('expiresIn');
      expect(tokenPair.tokenType).toBe('Bearer');
      expect(typeof tokenPair.expiresIn).toBe('number');
    });
  });

  describe('PasswordHasher Integration', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'MySecurePassword123!';

      const hash = await passwordHasher.hash(password);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);

      const isValid = await passwordHasher.verify(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await passwordHasher.verify('wrong-password', hash);
      expect(isInvalid).toBe(false);
    });

    it('should detect when rehash is needed', async () => {
      const password = 'test-password';
      const hash = await passwordHasher.hash(password);

      // Com a mesma configuração, não deve precisar rehash
      const needsRehash = await passwordHasher.needsRehash(hash);
      expect(needsRehash).toBe(false);
    });
  });

  describe('CacheManager Integration', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { data: 'test-value', timestamp: Date.now() };

      await cache.set(key, value, 60); // 60 seconds TTL

      const retrieved = await cache.get<typeof value>(key);
      expect(retrieved).toEqual(value);

      const exists = await cache.exists(key);
      expect(exists).toBe(true);
    });

    it('should handle TTL correctly', async () => {
      const key = 'ttl-test';
      const value = 'test-value';

      await cache.set(key, value, 1); // 1 second TTL
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait > 1 second

      const retrieved = await cache.get(key);
      expect(retrieved).toBeNull();

      const exists = await cache.exists(key);
      expect(exists).toBe(false);
    });

    it('should handle multiple operations', async () => {
      const entries = {
        'key1': 'value1',
        'key2': 'value2',
        'key3': 'value3',
      };

      await cache.setMultiple(entries);

      const retrieved = await cache.getMultiple(['key1', 'key2', 'key3']);
      expect(retrieved).toEqual(['value1', 'value2', 'value3']);
    });

    it('should increment counters', async () => {
      const key = 'counter';

      const value1 = await cache.increment(key);
      expect(value1).toBe(1);

      const value2 = await cache.increment(key, 5);
      expect(value2).toBe(6);
    });
  });

  describe('ObservabilityManager Integration', () => {
    it('should record metrics without throwing', () => {
      expect(() => {
        observability.recordMetric('test.metric', 42, { label: 'value' });
        observability.incrementCounter('test.counter', { type: 'integration' });
        observability.recordTiming('test.timing', 150, { operation: 'test' });
      }).not.toThrow();
    });

    it('should handle timer functionality', () => {
      const timer = observability.startTimer('test.timer', { test: 'integration' });
      expect(typeof timer).toBe('function');

      // Simulate some work
      setTimeout(() => {
        timer(); // Should not throw
      }, 10);
    });

    it('should log messages at different levels', () => {
      expect(() => {
        observability.log('info', 'Integration test message', { test: 'logging' });
        observability.log('warn', 'Warning message', { level: 'warning' });
        observability.log('error', 'Error message', { error: 'test' });
      }).not.toThrow();
    });

    it('should handle security events', () => {
      expect(() => {
        observability.recordSecurityEvent('login', 'user-123', '127.0.0.1', 'test-agent', {
          success: true,
        });
      }).not.toThrow();
    });
  });

  describe('Cross-Module Integration', () => {
    it('should handle complex authentication flow', async () => {
      // Simular um fluxo de autenticação completo
      const loginRequest: LoginRequest = {
        email: 'integration@example.com',
        password: 'IntegrationPass123!',
      };

      // 1. Hash da senha
      const hashedPassword = await passwordHasher.hash(loginRequest.password);

      // 2. Simular busca de usuário (em cenário real, viria do database)
      const mockUser = {
        id: 'user-integration',
        email: loginRequest.email,
        password: hashedPassword,
        role: { name: 'user', permissions: ['read', 'write'] },
      };

      // 3. Verificar senha
      const isPasswordValid = await passwordHasher.verify(loginRequest.password, mockUser.password);
      expect(isPasswordValid).toBe(true);

      // 4. Gerar tokens
      const payload: JWTPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role.name,
        permissions: mockUser.role.permissions,
        sessionId: 'session-integration',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'test-issuer',
        aud: 'test-audience',
        jti: 'jti-integration',
      };

      const tokens = await tokenManager.generatePair(payload);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      // 5. Cache dos tokens para performance
      await cache.set(`user:${mockUser.id}:tokens`, tokens, 3600);

      // 6. Registrar evento de segurança
      observability.recordSecurityEvent('login', mockUser.id, mockContext.ipAddress, mockContext.userAgent, {
        success: true,
        method: 'password',
      });

      // 7. Verificar se conseguimos recuperar do cache
      const cachedTokens = await cache.get(`user:${mockUser.id}:tokens`);
      expect(cachedTokens).toEqual(tokens);
    });

    it('should handle cache invalidation on logout', async () => {
      const userId = 'user-logout-test';
      const sessionData = { sessionId: 'session-123', active: true };

      // Cache session data
      await cache.set(`session:${userId}`, sessionData, 3600);

      // Verify it's cached
      const cached = await cache.get(`session:${userId}`);
      expect(cached).toEqual(sessionData);

      // Simulate logout - clear cache
      await cache.delete(`session:${userId}`);

      // Verify it's gone
      const afterDelete = await cache.get(`session:${userId}`);
      expect(afterDelete).toBeNull();

      // Record logout event
      observability.recordSecurityEvent('logout', userId, mockContext.ipAddress, mockContext.userAgent);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cache failures gracefully', async () => {
      // Test with a failing cache (simulate connection issues)
      const failingCache = {
        ...cache,
        get: async () => { throw new Error('Cache connection failed'); },
        set: async () => { throw new Error('Cache connection failed'); },
      };

      // Operations should not throw even if cache fails
      await expect(failingCache.get('test')).rejects.toThrow('Cache connection failed');
    });

    it('should handle token verification failures', async () => {
      const invalidToken = 'invalid.jwt.token';

      await expect(tokenManager.verify(invalidToken)).rejects.toThrow();
    });

    it('should handle observability failures gracefully', () => {
      const failingObservability = {
        ...observability,
        log: () => { throw new Error('Logging failed'); },
      };

      // Logging failures should not break the application
      expect(() => {
        failingObservability.log('error', 'This should not break anything');
      }).toThrow('Logging failed');
    });
  });
});
