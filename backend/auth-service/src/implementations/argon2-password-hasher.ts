import * as argon2 from 'argon2';
import { PasswordHasher, PasswordHasherConfig, PasswordStrengthResult } from '@/interfaces/password-hasher.interface';

/**
 * Implementação da interface PasswordHasher usando Argon2
 */
export class Argon2PasswordHasher implements PasswordHasher {
  constructor(private config: PasswordHasherConfig) {}

  async hash(password: string): Promise<string> {
    const options = {
      type: argon2.argon2id,
      memoryCost: this.config.memoryCost || 65536, // 64 MB
      timeCost: this.config.timeCost || 3,
      parallelism: this.config.parallelism || 1,
      hashLength: this.config.hashLength || 32,
    };

    return argon2.hash(password, options);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async needsRehash(hash: string): Promise<boolean> {
    try {
      // Argon2 doesn't have extractOptions, so we'll use a simpler approach
      // Check if the hash contains the expected parameters
      const hasExpectedParams = hash.includes('$argon2id$v=19$m=65536,t=3,p=1');
      
      // If it doesn't have expected params, it needs rehashing
      return !hasExpectedParams;
    } catch {
      return true; // If we can't parse, assume it needs rehashing
    }
  }

  async rehash(password: string): Promise<string> {
    return this.hash(password);
  }

  async analyzeStrength(password: string): Promise<PasswordStrengthResult> {
    const result: PasswordStrengthResult = {
      score: 0,
      feedback: [],
      strength: 'weak',
      entropy: 0,
      isValid: false,
    };

    // Length check
    if (password.length < 8) {
      result.feedback.push('Password should be at least 8 characters long');
    } else if (password.length >= 12) {
      result.score += 2;
    } else {
      result.score += 1;
    }

    // Character variety checks
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (hasLower) result.score += 1;
    if (hasUpper) result.score += 1;
    if (hasNumbers) result.score += 1;
    if (hasSymbols) result.score += 2;

    // Common patterns check
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        result.score -= 2;
        result.feedback.push('Avoid common patterns');
        break;
      }
    }

    // Calculate entropy (simplified)
    let charset = 0;
    if (hasLower) charset += 26;
    if (hasUpper) charset += 26;
    if (hasNumbers) charset += 10;
    if (hasSymbols) charset += 32;

    result.entropy = Math.log2(Math.pow(charset, password.length));

    // Determine strength
    if (result.score >= 6) {
      result.strength = 'strong';
      result.isValid = true;
    } else if (result.score >= 3) {
      result.strength = 'medium';
      result.isValid = true;
    } else {
      result.strength = 'weak';
      result.isValid = false;
    }

    return result;
  }

  async validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
