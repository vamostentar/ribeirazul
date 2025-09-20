import { TwoFactorConfig, TwoFactorProvider } from '@/interfaces/two-factor.interface';
import { TwoFactorSetup } from '@/types/auth';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

/**
 * Implementação da interface TwoFactorProvider usando TOTP (Time-based One-Time Password)
 */
export class TOTPProvider implements TwoFactorProvider {
  readonly name = 'totp';

  constructor(private config: TwoFactorConfig) {}

  async generateSetup(userId: string, userEmail: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `Ribeira Azul (${userEmail})`,
      issuer: 'Ribeira Azul',
      length: 32,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
    };
  }

  async verify(userId: string, code: string): Promise<boolean> {
    // In a real implementation, you'd fetch the user's secret from the database
    // For now, we'll return false as we don't have access to the user's secret
    return false;
  }

  async validateCode(secret: string, code: string): Promise<boolean> {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: this.config.window,
      });

      return verified;
    } catch (error) {
      return false;
    }
  }

  async disable(userId: string): Promise<void> {
    // In a real implementation, you'd remove the user's 2FA secret from the database
    // For now, this is a no-op
  }

  /**
   * Gera códigos de backup para recuperação
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Valida um código de backup
   */
  validateBackupCode(code: string, backupCodes: string[]): boolean {
    return backupCodes.includes(code.toUpperCase());
  }

  /**
   * Gera um novo conjunto de códigos de backup
   */
  generateNewBackupCodes(): string[] {
    return this.generateBackupCodes();
  }

  /**
   * Verifica se o código TOTP está dentro da janela de tempo válida
   */
  isCodeValid(secret: string, code: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: this.config.window,
      });
    } catch {
      return false;
    }
  }

  /**
   * Obtém o tempo restante para o próximo código
   */
  getTimeRemaining(): number {
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const timeStep = 30; // TOTP standard time step
    return timeStep - (epoch % timeStep);
  }

  /**
   * Gera um código TOTP para um secret específico
   */
  generateCode(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
    });
  }

  /**
   * Valida a configuração do TOTP
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.enabled) {
      return { valid: true, errors: [] };
    }

    if (this.config.window < 1 || this.config.window > 10) {
      errors.push('Window must be between 1 and 10');
    }

    if (this.config.maxAttempts < 1 || this.config.maxAttempts > 10) {
      errors.push('Max attempts must be between 1 and 10');
    }

    if (this.config.lockoutDuration < 60 || this.config.lockoutDuration > 3600) {
      errors.push('Lockout duration must be between 60 and 3600 seconds');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
