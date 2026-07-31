import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import * as crypto from 'crypto';
import { QuotaService } from '../tenants/quota.service';
import { PrismaService } from '../prisma/prisma.service';

export interface StorageCategoryStats {
  bytes: number;
  count: number;
}

export interface StorageFileItem {
  id: string;
  url: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  category: 'chatMedia' | 'aiDocuments' | 'products' | 'tickets';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    private readonly quotaService: QuotaService,
    private readonly prisma: PrismaService,
  ) {
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
              width: 800,
              height: 800,
              withoutEnlargement: true,
              fit: 'inside'
            })
            .webp({ quality: 60 })
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

  /**
   * Scans disk files and correlates with DB models to calculate storage stats per category.
   */
  async getStorageStats(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: { where: { status: 'active' }, include: { plan: true }, take: 1 }
      }
    });

    const activePlan = tenant?.subscriptions?.[0]?.plan;
    const limitMb = tenant?.customStorageLimitMb ?? activePlan?.storageLimitMb ?? 500;
    const limitBytes = limitMb * 1024 * 1024;

    const files = await this.getAllTenantFiles(tenantId);

    const stats = {
      chatMedia: { bytes: 0, count: 0 },
      aiDocuments: { bytes: 0, count: 0 },
      products: { bytes: 0, count: 0 },
      tickets: { bytes: 0, count: 0 }
    };

    let totalUsedBytes = 0;

    for (const file of files) {
      stats[file.category].bytes += file.sizeBytes;
      stats[file.category].count += 1;
      totalUsedBytes += file.sizeBytes;
    }

    return {
      categories: stats,
      totalUsedBytes,
      storageLimitMb: limitMb,
      storageLimitBytes: limitBytes
    };
  }

  /**
   * Returns list of file items filtered by category and upload age.
   */
  async getStorageFiles(tenantId: string, category?: string, olderThanDays?: number): Promise<StorageFileItem[]> {
    let files = await this.getAllTenantFiles(tenantId);

    if (category && ['chatMedia', 'aiDocuments', 'products', 'tickets'].includes(category)) {
      files = files.filter(f => f.category === category);
    }

    if (olderThanDays && !isNaN(Number(olderThanDays)) && Number(olderThanDays) > 0) {
      const cutoffTime = Date.now() - (Number(olderThanDays) * 24 * 60 * 60 * 1000);
      files = files.filter(f => new Date(f.createdAt).getTime() <= cutoffTime);
    }

    // Sort newest first
    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Permanently deletes physical file from VPS disk and clears DB references.
   */
  async deleteMedia(publicUrl: string, tenantId: string): Promise<boolean> {
    try {
      if (!publicUrl || !publicUrl.startsWith('/uploads/')) return false;

      // Security check: if URL is scoped to a specific tenant directory, verify match
      if (publicUrl.startsWith('/uploads/tenants/') && !publicUrl.startsWith(`/uploads/tenants/${tenantId}/`)) {
        return false;
      }

      const fileName = publicUrl.split('/').pop();
      if (!fileName) return false;

      // Check potential physical file locations on VPS disk
      const candidatePaths = [
        path.join(this.uploadDir, 'tenants', tenantId, fileName),
        path.join(process.cwd(), publicUrl),
        path.join(this.uploadDir, fileName),
        path.join(this.uploadDir, 'media', fileName),
        path.join(this.uploadDir, 'tickets', fileName)
      ];

      let freedBytes = 0;
      let unlinked = false;

      for (const filePath of candidatePaths) {
        if (fs.existsSync(filePath)) {
          try {
            const stats = fs.statSync(filePath);
            freedBytes = stats.size;
            await fs.promises.unlink(filePath);
            unlinked = true;
            this.logger.log(`Physically unlinked file from disk: ${filePath}`);
            break;
          } catch (unlinkErr) {
            this.logger.warn(`File unlink warning for ${filePath}: ${unlinkErr.message}`);
          }
        }
      }

      if (!unlinked) {
        this.logger.log(`File missing from disk: ${publicUrl}`);
      }

      // Clean up DB references so dead links aren't left in models
      await Promise.all([
        // Clear product image
        this.prisma.product.updateMany({
          where: { tenantId, imageUrl: publicUrl },
          data: { imageUrl: null }
        }),
        // Clear ticket message attachment
        this.prisma.ticketMessage.updateMany({
          where: { ticket: { tenantId }, attachmentUrl: publicUrl },
          data: { attachmentUrl: null }
        }),
        // Remove Knowledge Document if matching
        this.prisma.knowledgeDocument.deleteMany({
          where: { tenantId, OR: [{ filename: fileName }, { filename: publicUrl }] }
        })
      ]).catch(err => this.logger.warn(`DB reference cleanup non-fatal warning: ${err.message}`));

      // 3. Decrement storage quota
      if (freedBytes > 0) {
        await this.quotaService.decrementStorage(tenantId, freedBytes);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete media ${publicUrl}: ${error.message}`);
      return false;
    }
  }

  async clearAllMedia(tenantId: string): Promise<boolean> {
    try {
      const tenantDir = path.join(this.uploadDir, 'tenants', tenantId);
      if (fs.existsSync(tenantDir)) {
        const files = fs.readdirSync(tenantDir);
        for (const file of files) {
          const filePath = path.join(tenantDir, file);
          try {
            await fs.promises.unlink(filePath);
          } catch (e) {}
        }
      }
      await this.quotaService.resetStorage(tenantId);
      return true;
    } catch (error) {
      this.logger.error(`Failed to clear media: ${error.message}`);
      return false;
    }
  }

  /**
   * Helper function to scan disk files and DB records to classify into categories.
   */
  private async getAllTenantFiles(tenantId: string): Promise<StorageFileItem[]> {
    const itemsMap = new Map<string, StorageFileItem>();

    // 1. Query DB for known category mappings
    const [docs, products, ticketMsgs, chatMessages] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where: { tenantId },
        select: { id: true, filename: true, uploadedAt: true }
      }),
      this.prisma.product.findMany({
        where: { tenantId, imageUrl: { not: null } },
        select: { id: true, imageUrl: true, createdAt: true }
      }),
      this.prisma.ticketMessage.findMany({
        where: { ticket: { tenantId }, attachmentUrl: { not: null } },
        select: { id: true, attachmentUrl: true, createdAt: true }
      }),
      this.prisma.message.findMany({
        where: {
          conversation: { tenantId },
          type: { in: ['image', 'video', 'document', 'audio', 'file'] }
        },
        select: { id: true, type: true, content: true, createdAt: true }
      })
    ]);

    const docNameMap = new Map(docs.map(d => [d.filename.toLowerCase(), d.uploadedAt]));
    const productUrlMap = new Map(products.map(p => [(p.imageUrl || '').toLowerCase(), p.createdAt]));
    const ticketUrlMap = new Map(ticketMsgs.map(t => [(t.attachmentUrl || '').toLowerCase(), t.createdAt]));

    // 2. Scan disk files in uploads/tenants/${tenantId}
    const tenantDir = path.join(this.uploadDir, 'tenants', tenantId);
    if (fs.existsSync(tenantDir)) {
      const fileNames = fs.readdirSync(tenantDir);
      for (const fileName of fileNames) {
        const filePath = path.join(tenantDir, fileName);
        if (!fs.existsSync(filePath)) continue;

        try {
          const stats = fs.statSync(filePath);
          const publicUrl = `/uploads/tenants/${tenantId}/${fileName}`;
          const lowerUrl = publicUrl.toLowerCase();
          const lowerName = fileName.toLowerCase();

          let category: 'chatMedia' | 'aiDocuments' | 'products' | 'tickets' = 'chatMedia';
          let createdAt = stats.birthtime ? stats.birthtime.toISOString() : stats.mtime.toISOString();

          if (docNameMap.has(lowerName) || docNameMap.has(lowerUrl)) {
            category = 'aiDocuments';
            createdAt = docNameMap.get(lowerName)?.toISOString() || createdAt;
          } else if (productUrlMap.has(lowerUrl)) {
            category = 'products';
            createdAt = productUrlMap.get(lowerUrl)?.toISOString() || createdAt;
          } else if (ticketUrlMap.has(lowerUrl)) {
            category = 'tickets';
            createdAt = ticketUrlMap.get(lowerUrl)?.toISOString() || createdAt;
          }

          itemsMap.set(publicUrl, {
            id: publicUrl,
            url: publicUrl,
            name: fileName,
            sizeBytes: stats.size,
            createdAt,
            category
          });
        } catch (err) {
          this.logger.warn(`Error statting file ${fileName}: ${err.message}`);
        }
      }
    }

    // 3. Scan chat media messages from DB to catch files in legacy uploads paths
    for (const msg of chatMessages) {
      let mediaUrl: string | undefined;
      const content = msg.content as any;

      if (typeof content === 'object' && content !== null) {
        mediaUrl = content.mediaUrl || content.url || content.fileUrl || content.localUrl;
      } else if (typeof content === 'string' && content.startsWith('/uploads/')) {
        mediaUrl = content;
      }

      if (!mediaUrl || !mediaUrl.startsWith('/uploads/')) continue;
      if (itemsMap.has(mediaUrl)) continue; // Already scanned from tenant dir

      const fileName = mediaUrl.split('/').pop() || `chat_file_${msg.id}`;

      // Check physical file existence across uploads locations
      const candidatePaths = [
        path.join(process.cwd(), mediaUrl),
        path.join(this.uploadDir, fileName),
        path.join(this.uploadDir, 'media', fileName),
        path.join(this.uploadDir, 'tenants', tenantId, fileName)
      ];

      let sizeBytes = 0;
      let foundPath: string | null = null;

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            const stats = fs.statSync(p);
            sizeBytes = stats.size;
            foundPath = p;
            break;
          } catch (e) {}
        }
      }

      if (foundPath || sizeBytes > 0) {
        itemsMap.set(mediaUrl, {
          id: mediaUrl,
          url: mediaUrl,
          name: fileName,
          sizeBytes,
          createdAt: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
          category: 'chatMedia'
        });
      }
    }

    return Array.from(itemsMap.values());
  }
}
