import { RequestContext } from '@/types/common';

/**
 * Contrato para utilitários de contexto de requisição
 */
export interface RequestContextUtilsContract {
  /**
   * Cria novo contexto de requisição
   */
  createContext(request: any): RequestContext;

  /**
   * Atualiza contexto com informações do usuário
   */
  updateWithUser(context: RequestContext, userId: string, role: string): RequestContext;

  /**
   * Calcula duração da requisição
   */
  calculateDuration(context: RequestContext): number;

  /**
   * Gera ID único para requisição
   */
  generateRequestId(): string;
}

/**
 * Contrato para utilitários de logging
 */
export interface LoggingUtilsContract {
  /**
   * Registra evento de login bem-sucedido
   */
  logLoginSuccess(userId: string, context: RequestContext): void;

  /**
   * Registra tentativa de login falhada
   */
  logLoginFailed(email: string, reason: string, context: RequestContext): void;

  /**
   * Registra evento de logout
   */
  logLogout(userId: string, context: RequestContext): void;

  /**
   * Registra criação de usuário
   */
  logUserCreated(userId: string, createdBy: string, context: RequestContext): void;

  /**
   * Registra atualização de usuário
   */
  logUserUpdated(userId: string, updatedBy: string, changes: any, context: RequestContext): void;

  /**
   * Registra exclusão de usuário
   */
  logUserDeleted(userId: string, deletedBy: string, context: RequestContext): void;

  /**
   * Registra criação de role
   */
  logRoleCreated(roleId: string, roleName: string, createdBy: string, context: RequestContext): void;

  /**
   * Registra atualização de role
   */
  logRoleUpdated(roleId: string, roleName: string, updatedBy: string, changes: any, context: RequestContext): void;
}

/**
 * Contrato para utilitários de criptografia
 */
export interface CryptoUtilsContract {
  /**
   * Gera hash de senha
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verifica senha contra hash
   */
  verifyPassword(hash: string, password: string): Promise<boolean>;

  /**
   * Gera token seguro
   */
  generateSecureToken(length?: number): string;

  /**
   * Gera UUID
   */
  generateUUID(): string;

  /**
   * Gera JTI para JWT
   */
  generateJTI(): string;

  /**
   * Gera token de sessão
   */
  generateSessionToken(): string;

  /**
   * Gera chave API
   */
  generateApiKey(): string;

  /**
   * Gera códigos de backup para 2FA
   */
  generateBackupCodes(count?: number): string[];

  /**
   * Gera hash SHA256
   */
  sha256(data: string): string;

  /**
   * Gera HMAC-SHA256
   */
  hmacSha256(data: string, secret: string): string;

  /**
   * Hash chave API para armazenamento
   */
  hashApiKey(apiKey: string): string;

  /**
   * Obtém preview da chave API
   */
  getApiKeyPreview(apiKey: string): string;

  /**
   * Gera segredo TOTP
   */
  generateTOTPSecret(): string;

  /**
   * Gera URL QR code para TOTP
   */
  generateTOTPQRCode(secret: string, userEmail: string): string;

  /**
   * Verifica token TOTP
   */
  verifyTOTP(token: string, secret: string): boolean;

  /**
   * Gera token TOTP atual
   */
  generateTOTP(secret: string): string;

  /**
   * Encripta dados sensíveis
   */
  encrypt(text: string, password: string): string;

  /**
   * Decripta dados sensíveis
   */
  decrypt(encryptedData: string, password: string): string;

  /**
   * Análise força da senha
   */
  analyzePasswordStrength(password: string): any;

  /**
   * Comparação segura de strings
   */
  timingSafeEqual(a: string, b: string): boolean;

  /**
   * Gera chave para rate limiting
   */
  generateRateLimitKey(identifier: string, action: string): string;

  /**
   * Gera chave para lockout
   */
  generateLockoutKey(identifier: string): string;

  /**
   * Inteiro aleatório seguro
   */
  secureRandomInt(min: number, max: number): number;

  /**
   * String aleatória segura
   */
  generateRandomString(length: number, charset?: string): string;
}

/**
 * Contrato para validação de dados
 */
export interface ValidationUtilsContract {
  /**
   * Valida email
   */
  validateEmail(email: string): boolean;

  /**
   * Valida senha
   */
  validatePassword(password: string): any;

  /**
   * Valida telefone
   */
  validatePhone(phone: string): boolean;

  /**
   * Valida UUID
   */
  validateUUID(uuid: string): boolean;

  /**
   * Sanitiza entrada de string
   */
  sanitizeString(input: string): string;

  /**
   * Valida permissões
   */
  validatePermissions(permissions: string[]): boolean;

  /**
   * Escapa caracteres especiais para SQL
   */
  escapeSqlString(input: string): string;
}
