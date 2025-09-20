/**
 * Interface para abstração de hash de senhas
 * Permite trocar algoritmos (Argon2, bcrypt, scrypt, etc.) sem afetar o código de negócio
 */
export interface PasswordHasher {
  /**
   * Gera hash de uma senha
   */
  hash(password: string): Promise<string>;

  /**
   * Verifica se uma senha corresponde ao hash
   */
  verify(password: string, hash: string): Promise<boolean>;

  /**
   * Verifica se um hash precisa ser atualizado (mudança de parâmetros de segurança)
   */
  needsRehash(hash: string): Promise<boolean>;

  /**
   * Re-hash uma senha com novos parâmetros
   */
  rehash(password: string): Promise<string>;
}

/**
 * Interface para configuração do PasswordHasher
 */
export interface PasswordHasherConfig {
  algorithm?: 'argon2' | 'bcrypt' | 'scrypt';
  memoryCost?: number;  // Para argon2
  timeCost?: number;    // Para argon2
  parallelism?: number; // Para argon2
  hashLength?: number;  // Para argon2
  saltRounds?: number;  // Para bcrypt
  cost?: number;        // Para scrypt
}

/**
 * Interface para resultado de análise de força de senha
 */
export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: 'weak' | 'medium' | 'strong';
  feedback: string[];
  isValid: boolean;
  entropy: number;
}

/**
 * Interface para analisador de força de senha
 */
export interface PasswordStrengthAnalyzer {
  analyze(password: string): PasswordStrengthResult;
  validate(password: string): boolean;
}
