import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  private getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'zinichat-security-master-key-32b';
    return crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Encrypts a plaintext string using AES-256-CBC.
   * Output format: `ivHex:encryptedHex`
   */
  encrypt(text: string | null | undefined): string {
    if (!text) return '';
    // If text is already encrypted (contains iv:ciphertext format), return as-is
    if (text.includes(':') && text.split(':')[0].length === 32) {
      return text;
    }
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (err: any) {
      this.logger.error(`Encryption failed: ${err.message}`);
      return text;
    }
  }

  /**
   * Decrypts an encrypted string (ivHex:encryptedHex).
   * If string is not encrypted (legacy plaintext), returns as-is safely.
   */
  decrypt(text: string | null | undefined): string {
    if (!text) return '';
    if (!text.includes(':')) return text; // Plaintext fallback
    try {
      const [ivHex, encryptedText] = text.split(':');
      if (!ivHex || !encryptedText || ivHex.length !== 32) return text;
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err: any) {
      this.logger.error(`Decryption failed: ${err.message}`);
      return text; // Safe fallback if legacy key mismatch
    }
  }
}
