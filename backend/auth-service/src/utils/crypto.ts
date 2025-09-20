import { config } from '@/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';

// =====================================================
// PASSWORD HASHING
// =====================================================

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hashBuffer = await argon2.hash(password, {
      memoryCost: config.argon2Config.memoryCost,
      timeCost: config.argon2Config.timeCost,
      parallelism: config.argon2Config.parallelism,
      hashLength: 32,
    } as any);
    return String(hashBuffer);
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

/**
 * Check if password needs rehashing (due to changed security parameters)
 */
export function needsRehash(hash: string): boolean {
  try {
    return argon2.needsRehash(hash, {
      memoryCost: config.argon2Config.memoryCost,
      timeCost: config.argon2Config.timeCost,
      parallelism: config.argon2Config.parallelism,
    } as any);
  } catch (error) {
    return true; // If we can't check, assume it needs rehashing
  }
}

// =====================================================
// TOKEN GENERATION
// =====================================================

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a JWT ID (jti) - a unique identifier for JWT tokens
 */
export function generateJTI(): string {
  return generateUUID();
}

/**
 * Generate a session token
 */
export function generateSessionToken(): string {
  return generateSecureToken(48); // 96 character hex string
}

/**
 * Generate an API key
 */
export function generateApiKey(): string {
  const prefix = 'rz_'; // Ribeira Azul prefix
  const key = generateSecureToken(32); // 64 character hex string
  return `${prefix}${key}`;
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-digit codes
    const code = crypto.randomInt(10000000, 99999999).toString();
    codes.push(code);
  }
  
  return codes;
}

// =====================================================
// HASHING AND SIGNING
// =====================================================

/**
 * Create SHA256 hash of a string
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create HMAC-SHA256 signature
 */
export function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return sha256(apiKey);
}

/**
 * Get API key preview (first 8 characters for identification)
 */
export function getApiKeyPreview(apiKey: string): string {
  return apiKey.substring(0, 8) + '...';
}

// =====================================================
// TWO-FACTOR AUTHENTICATION
// =====================================================

/**
 * Generate a TOTP secret
 */
export function generateTOTPSecret(): string {
  return speakeasy.generateSecret({
    name: config.TOTP_ISSUER,
    length: 32,
  }).base32;
}

/**
 * Generate TOTP QR code URL
 */
export function generateTOTPQRCode(secret: string, userEmail: string): string {
  return speakeasy.otpauthURL({
    secret,
    label: userEmail,
    issuer: config.TOTP_ISSUER,
    encoding: 'base32',
  });
}

/**
 * Verify TOTP token
 */
export function verifyTOTP(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: config.TOTP_WINDOW,
  });
}

/**
 * Generate current TOTP token (for testing)
 */
export function generateTOTP(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
}

// =====================================================
// ENCRYPTION/DECRYPTION
// =====================================================

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string, password: string): string {
  try {
    const key = crypto.scryptSync(password, 'salt', KEY_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('auth-service', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv + tag + encrypted data
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  } catch (error) {
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string, password: string): string {
  try {
    const key = crypto.scryptSync(password, 'salt', KEY_LENGTH);
    
    // Extract iv, tag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('auth-service', 'utf8'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt data');
  }
}

// =====================================================
// PASSWORD STRENGTH VALIDATION
// =====================================================

export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: 'weak' | 'medium' | 'strong';
  feedback: string[];
  isValid: boolean;
}

/**
 * Analyze password strength
 */
export function analyzePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score += 20;
  else feedback.push('Password should be at least 8 characters long');

  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 10;
  else feedback.push('Password should contain lowercase letters');

  if (/[A-Z]/.test(password)) score += 10;
  else feedback.push('Password should contain uppercase letters');

  if (/\d/.test(password)) score += 10;
  else feedback.push('Password should contain numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  else feedback.push('Password should contain special characters');

  // Pattern checks
  if (!/(.)\1{2,}/.test(password)) score += 10; // No repeated characters
  else feedback.push('Avoid repeating characters');

  if (!/012|123|234|345|456|567|678|789|890/.test(password)) score += 5; // No sequential numbers
  if (!/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) score += 5; // No sequential letters

  // Common password check (basic)
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome'];
  if (!commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score += 10;
  } else {
    feedback.push('Avoid common passwords');
    score -= 20;
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score < 40) strength = 'weak';
  else if (score < 70) strength = 'medium';
  else strength = 'strong';

  // Validation based on config
  const isValid = password.length >= 8 && 
                 /[a-z]/.test(password) && 
                 /[A-Z]/.test(password) && 
                 /\d/.test(password);

  return {
    score: Math.max(0, Math.min(100, score)),
    strength,
    feedback,
    isValid,
  };
}

// =====================================================
// TIMING SAFE COMPARISON
// =====================================================

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  return crypto.timingSafeEqual(bufferA, bufferB);
}

// =====================================================
// RATE LIMITING HELPERS
// =====================================================

/**
 * Generate a rate limiting key
 */
export function generateRateLimitKey(identifier: string, action: string): string {
  return `rl:${action}:${sha256(identifier)}`;
}

/**
 * Generate a lockout key for failed login attempts
 */
export function generateLockoutKey(identifier: string): string {
  return `lockout:${sha256(identifier)}`;
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Generate a secure random integer between min and max (inclusive)
 */
export function secureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const maxUsableValue = Math.floor(maxValue / range) * range;

  let randomValue;
  do {
    const randomBytes = crypto.randomBytes(bytesNeeded);
    randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = (randomValue << 8) + randomBytes[i];
    }
  } while (randomValue >= maxUsableValue);

  return (randomValue % range) + min;
}

/**
 * Generate a cryptographically secure random string with specific charset
 */
export function generateRandomString(length: number, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[secureRandomInt(0, charset.length - 1)];
  }
  return result;
}
