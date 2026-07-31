import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';

  private getEncryptionKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
      // Fallback for development if not configured, but warn
      console.warn('[SECURITY WARNING] ENCRYPTION_KEY is missing from environment. Using default fallback key.');
      return crypto.scryptSync('zinichat-default-development-salt-key-2026', 'salt', 32);
    }
    
    // Key could be hex string (64 characters) or raw string
    if (keyHex.length === 64 && /^[0-9a-fA-F]+$/.test(keyHex)) {
      return Buffer.from(keyHex, 'hex');
    }
    
    return crypto.scryptSync(keyHex, 'salt', 32);
  }

  /**
   * Encrypts plaintext string using AES-256-GCM.
   * Returns format: "base64iv.base64authtag.base64ciphertext"
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(16); // 128-bit IV
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag().toString('base64');
      const ivBase64 = iv.toString('base64');
      
      return `${ivBase64}.${authTag}.${encrypted}`;
    } catch (error: any) {
      console.error('[CRYPTO] Encryption failed:', error.message);
      throw new InternalServerErrorException('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypts encrypted string format "base64iv.base64authtag.base64ciphertext".
   */
  decrypt(encryptedPayload: string): string {
    if (!encryptedPayload) return '';
    
    // Backward compatibility: If it doesn't contain dots, it might be legacy plaintext key
    if (!encryptedPayload.includes('.')) {
      return encryptedPayload;
    }

    try {
      const parts = encryptedPayload.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
      }

      const [ivBase64, authTagBase64, ciphertextBase64] = parts;
      const key = this.getEncryptionKey();
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      console.error('[CRYPTO] Decryption failed:', error.message);
      throw new InternalServerErrorException('Failed to decrypt API key');
    }
  }
}
