import { TwoFactorSetup } from '@/types/auth';

/**
 * Interface para abstração de autenticação de dois fatores
 * Permite trocar provedores (TOTP, SMS, email, etc.) sem afetar o código de negócio
 */
export interface TwoFactorProvider {
  /**
   * Nome do provedor (totp, sms, email, etc.)
   */
  readonly name: string;

  /**
   * Gera configuração para 2FA
   */
  generateSetup(userId: string, userEmail: string): Promise<TwoFactorSetup>;

  /**
   * Verifica código de 2FA
   */
  verify(userId: string, code: string): Promise<boolean>;

  /**
   * Valida código sem verificar usuário específico
   */
  validateCode(secret: string, code: string): Promise<boolean>;

  /**
   * Desabilita 2FA para usuário
   */
  disable(userId: string): Promise<void>;
}

/**
 * Interface para gerenciador de 2FA
 */
export interface TwoFactorManager {
  /**
   * Registra um provedor de 2FA
   */
  registerProvider(provider: TwoFactorProvider): void;

  /**
   * Gera configuração para 2FA usando provedor padrão
   */
  generateSetup(userId: string, userEmail: string): Promise<TwoFactorSetup>;

  /**
   * Verifica código de 2FA
   */
  verify(userId: string, code: string): Promise<boolean>;

  /**
   * Verifica código usando provedor específico
   */
  verifyWithProvider(providerName: string, userId: string, code: string): Promise<boolean>;

  /**
   * Desabilita 2FA para usuário
   */
  disable(userId: string): Promise<void>;

  /**
   * Lista provedores disponíveis
   */
  getAvailableProviders(): string[];

  /**
   * Define provedor padrão
   */
  setDefaultProvider(providerName: string): void;
}

/**
 * Interface para configuração de 2FA
 */
export interface TwoFactorConfig {
  enabled: boolean;
  defaultProvider: string;
  window: number;     // Tolerância para códigos TOTP
  maxAttempts: number;
  lockoutDuration: number;
}

/**
 * Interface para resultado de verificação de 2FA
 */
export interface TwoFactorVerificationResult {
  valid: boolean;
  attemptsRemaining?: number;
  lockedUntil?: Date;
  provider?: string;
}
