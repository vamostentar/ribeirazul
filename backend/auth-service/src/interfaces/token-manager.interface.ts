import { JWTPayload, TokenPair } from '@/types/auth';

/**
 * Interface para abstração de gerenciamento de tokens
 * Permite trocar implementações (JWT, PASETO, etc.) sem afetar o código de negócio
 */
export interface TokenManager {
  /**
   * Gera um novo token JWT
   */
  generate(payload: JWTPayload): Promise<string>;

  /**
   * Verifica e decodifica um token JWT
   */
  verify(token: string): Promise<JWTPayload>;

  /**
   * Gera um par de tokens (access + refresh)
   */
  generatePair(payload: JWTPayload): Promise<TokenPair>;

  /**
   * Atualiza tokens usando refresh token
   */
  refresh(refreshToken: string): Promise<TokenPair>;

  /**
   * Extrai payload de um token sem verificar assinatura
   */
  decode(token: string): JWTPayload;

  /**
   * Verifica se um token está expirado
   */
  isExpired(token: string): boolean;

  /**
   * Revoga um token (adiciona à blacklist)
   */
  revoke(token: string): Promise<void>;

  /**
   * Verifica se um token foi revogado
   */
  isRevoked(token: string): Promise<boolean>;

  /**
   * Limpa tokens expirados da blacklist
   */
  cleanupExpired(): Promise<number>;
}

/**
 * Interface para configuração do TokenManager
 */
export interface TokenManagerConfig {
  secret: string;
  accessExpiry: string;
  refreshExpiry: string;
  issuer: string;
  audience: string;
  algorithm?: string;
}

/**
 * Interface para resultado de verificação de token
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Interface para cache de tokens (opcional)
 */
export interface TokenCache {
  get(token: string): Promise<TokenVerificationResult | null>;
  set(token: string, result: TokenVerificationResult, ttl?: number): Promise<void>;
  delete(token: string): Promise<void>;
  clear(): Promise<void>;
}
