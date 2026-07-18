import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import * as crypto from 'crypto';
import { QuotaService } from '../tenants/quota.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private readonly quotaService: QuotaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadMedia(file: Express.Multer.File, tenantId: string): Promise<string> {
    // Check storage limit first
    await this.quotaService.checkStorageQuota(tenantId, file.size);

    const tenantDir = path.join(this.uploadDir, 'tenants', tenantId);
    
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const fileExt = path.extname(file.originalname).toLowerCase();
    let fileName = `${crypto.randomUUID()}${fileExt}`;
    let filePath = path.join(tenantDir, fileName);
    let publicUrl = `/uploads/tenants/${tenantId}/${fileName}`;

    let savedBytes = file.size;

    try {
      if (file.mimetype.startsWith('image/')) {
        if (file.mimetype !== 'image/svg+xml') {
          fileName = `${crypto.randomUUID()}.webp`;
          filePath = path.join(tenantDir, fileName);
          publicUrl = `/uploads/tenants/${tenantId}/${fileName}`;

          const info = await sharp(file.buffer)
            .resize({
              width: 1920,
              withoutEnlargement: true,
              fit: 'inside'
            })
            .webp({ quality: 80 })
            .toFile(filePath);

          savedBytes = info.size;
          this.logger.log(`Compressed and saved image: ${publicUrl}`);
        } else {
          fs.writeFileSync(filePath, file.buffer);
          this.logger.log(`Saved file: ${publicUrl}`);
        }
      } else {
        fs.writeFileSync(filePath, file.buffer);
        this.logger.log(`Saved file: ${publicUrl}`);
      }

      await this.quotaService.incrementStorage(tenantId, savedBytes);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Failed to save file: ${error.message}`, error.stack);
      throw new Error('Failed to process and save file');
    }
  }

  async deleteMedia(publicUrl: string, tenantId: string): Promise<boolean> {
    try {
      if (!publicUrl.includes(`/uploads/tenants/${tenantId}/`)) return false;
      const fileName = publicUrl.split('/').pop();
      if (!fileName) return false;

      const filePath = path.join(this.uploadDir, 'tenants', tenantId, fileName);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fs.unlinkSync(filePath);
        await this.quotaService.decrementStorage(tenantId, stats.size);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete media: ${error.message}`);
      return false;
    }
  }
}
