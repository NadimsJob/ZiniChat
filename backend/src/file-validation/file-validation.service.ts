import { Injectable, BadRequestException } from '@nestjs/common';

export const FILE_SIZE_LIMITS: Record<string, number> = {
  pdf: 5 * 1024 * 1024,      // 5MB
  docx: 3 * 1024 * 1024,     // 3MB
  png: 2 * 1024 * 1024,      // 2MB
  jpeg: 2 * 1024 * 1024,     // 2MB
  gif: 2 * 1024 * 1024,      // 2MB
  text: 1 * 1024 * 1024      // 1MB
};

const MAGIC_NUMBERS: Record<string, Buffer | null> = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  docx: Buffer.from([0x50, 0x4B, 0x03, 0x04]), // PK.. (ZIP)
  png: Buffer.from([0x89, 0x50, 0x4E, 0x47]), // .PNG
  jpeg: Buffer.from([0xFF, 0xD8, 0xFF]), // ÿØÿ
  gif: Buffer.from([0x47, 0x49, 0x46]), // GIF
  text: null // Plaintext files have no specific magic header
};

@Injectable()
export class FileValidationService {

  detectFileType(buffer: Buffer): string {
    if (!buffer || buffer.length === 0) return 'unknown';

    for (const [type, magic] of Object.entries(MAGIC_NUMBERS)) {
      if (magic && buffer.length >= magic.length) {
        if (buffer.subarray(0, magic.length).equals(magic)) {
          return type;
        }
      }
    }

    // Check if it's text by validating utf-8 printable characters
    const isText = this.isTextBuffer(buffer.subarray(0, Math.min(buffer.length, 512)));
    if (isText) return 'text';

    return 'unknown';
  }

  getFileTypeFromExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'png': return 'png';
      case 'jpg':
      case 'jpeg': return 'jpeg';
      case 'gif': return 'gif';
      case 'txt':
      case 'md':
      case 'csv': return 'text';
      default: return ext || 'unknown';
    }
  }

  validateFile(file: any): { detectedType: string; providedType: string } {
    if (!file || !file.buffer) {
      throw new BadRequestException('File content is empty or invalid');
    }

    const buffer: Buffer = file.buffer;
    const providedType = this.getFileTypeFromExtension(file.originalname || '');
    const detectedType = this.detectFileType(buffer);

    // Mismatch check (e.g. executable/zip disguised as pdf)
    if (providedType !== 'text' && detectedType !== 'unknown' && detectedType !== providedType) {
      throw new BadRequestException(`File type mismatch. File extension claims '${providedType}', but actual file header detected as '${detectedType}'.`);
    }

    // Size limit check
    const sizeLimit = FILE_SIZE_LIMITS[detectedType] || FILE_SIZE_LIMITS[providedType] || 2 * 1024 * 1024;
    if (buffer.length > sizeLimit) {
      const maxMb = (sizeLimit / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(`File too large. Maximum ${maxMb}MB allowed for ${providedType} files.`);
    }

    // Dangerous pattern check for text/pdf/docx
    if (this.hasDangerousContent(buffer, detectedType)) {
      throw new BadRequestException('File contains potentially malicious or dangerous code patterns');
    }

    return { detectedType, providedType };
  }

  hasDangerousContent(buffer: Buffer, type: string): boolean {
    if (!['text', 'pdf', 'docx'].includes(type)) return false;

    const sample = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf8');
    const dangerousPatterns = [
      /<script[\s>]/i,
      /javascript:/i,
      /eval\(/i,
      /\bexec\(/i,
      /PowerShell/i,
      /cmd\.exe/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(sample));
  }

  private isTextBuffer(buffer: Buffer): boolean {
    for (let i = 0; i < buffer.length; i++) {
      const charCode = buffer[i];
      // Allow standard printable ASCII and standard UTF-8 whitespace
      if (charCode < 9 || (charCode > 13 && charCode < 32 && charCode !== 27)) {
        return false;
      }
    }
    return true;
  }
}
