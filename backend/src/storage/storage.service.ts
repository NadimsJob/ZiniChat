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
        subscriptions: { where: { status: { in: ['active', 'trialing'] } }, include: { plan: true }, take: 1 }
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

    // Auto-sync tenant.storageUsedBytes in DB if different
    if (tenant && (tenant.storageUsedBytes !== BigInt(totalUsedBytes))) {
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { storageUsedBytes: BigInt(totalUsedBytes) }
      }).catch(err => this.logger.warn(`Failed to auto-sync storageUsedBytes: ${err.message}`));
    }

    return {
      categories: stats,
      totalUsedBytes,
      storageLimitMb: limitMb,
      storageLimitBytes: limitBytes
    };
  }

  /**
   * Recalculates the storage usage by scanning disk files and updates the tenant's storageUsedBytes.
   */
  async recalculateStorage(tenantId: string) {
    const stats = await this.getStorageStats(tenantId);
    
    // Update the DB counter to match the actual physical size
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { storageUsedBytes: BigInt(stats.totalUsedBytes) }
    });

    // Also trigger quota checks to update any 80/100 warning flags based on the new actual size
    const limitBytes = BigInt(stats.storageLimitBytes);
    const newPercent = limitBytes > BigInt(0) ? Number((BigInt(stats.totalUsedBytes) * BigInt(100)) / limitBytes) : 0;
    
    const resetFlags: any = {};
    if (newPercent < 80) resetFlags.storageWarning80Notified = false;
    if (newPercent < 100) resetFlags.storageWarning100Notified = false;
    
    if (Object.keys(resetFlags).length > 0) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: resetFlags
      });
    }

    return {
      success: true,
      totalUsedBytes: stats.totalUsedBytes,
      categories: stats.categories
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
        path.join(this.uploadDir, 'products', fileName),
        path.join(this.uploadDir, 'tickets', fileName),
        path.join(this.uploadDir, 'media', fileName),
        path.join(this.uploadDir, fileName),
        path.join(process.cwd(), publicUrl.startsWith('/') ? publicUrl.slice(1) : publicUrl),
        path.join(process.cwd(), publicUrl)
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
        select: { id: true, filename: true, fileSizeBytes: true, uploadedAt: true }
      }),
      this.prisma.product.findMany({
        where: { tenantId },
        select: { id: true, name: true, imageUrl: true, images: true, createdAt: true }
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

    // 2. Process Products (Product Photos & Gallery)
    for (const prod of products) {
      const urls: string[] = [];
      if (prod.imageUrl) urls.push(prod.imageUrl);
      if (Array.isArray(prod.images)) {
        for (const img of prod.images) {
          if (typeof img === 'string' && img.trim()) urls.push(img.trim());
        }
      }

      for (const url of urls) {
        if (!url || itemsMap.has(url)) continue;
        if (!url.startsWith('/uploads/')) continue;

        const fileName = url.split('/').pop() || `prod_${prod.id}.webp`;
        const candidatePaths = [
          path.join(this.uploadDir, 'products', fileName),
          path.join(this.uploadDir, 'tenants', tenantId, fileName),
          path.join(this.uploadDir, fileName),
          path.join(process.cwd(), url.startsWith('/') ? url.slice(1) : url)
        ];

        let sizeBytes = 0;
        for (const cp of candidatePaths) {
          if (fs.existsSync(cp)) {
            try {
              sizeBytes = fs.statSync(cp).size;
              break;
            } catch {}
          }
        }

        itemsMap.set(url, {
          id: `${prod.id}_${fileName}`,
          url,
          name: `${prod.name || 'Product'} (${fileName})`,
          sizeBytes,
          createdAt: prod.createdAt ? prod.createdAt.toISOString() : new Date().toISOString(),
          category: 'products'
        });
      }
    }

    // 3. Process AI Knowledge Documents
    for (const doc of docs) {
      const docUrl = `/uploads/tenants/${tenantId}/${doc.filename}`;
      if (itemsMap.has(docUrl) || itemsMap.has(doc.filename)) continue;

      const candidatePaths = [
        path.join(this.uploadDir, 'tenants', tenantId, doc.filename),
        path.join(this.uploadDir, 'documents', doc.filename),
        path.join(this.uploadDir, doc.filename),
        path.join(process.cwd(), doc.filename)
      ];

      let sizeBytes = doc.fileSizeBytes || 0;
      for (const cp of candidatePaths) {
        if (fs.existsSync(cp)) {
          try {
            sizeBytes = fs.statSync(cp).size;
            break;
          } catch {}
        }
      }

      itemsMap.set(docUrl, {
        id: doc.id,
        url: docUrl,
        name: doc.filename,
        sizeBytes,
        createdAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : new Date().toISOString(),
        category: 'aiDocuments'
      });
    }

    // 4. Process Support Ticket Messages
    for (const tm of ticketMsgs) {
      if (!tm.attachmentUrl || !tm.attachmentUrl.startsWith('/uploads/')) continue;
      const url = tm.attachmentUrl;
      if (itemsMap.has(url)) continue;

      const fileName = url.split('/').pop() || `ticket_${tm.id}`;
      const candidatePaths = [
        path.join(this.uploadDir, 'tickets', fileName),
        path.join(this.uploadDir, 'tenants', tenantId, fileName),
        path.join(this.uploadDir, fileName),
        path.join(process.cwd(), url.startsWith('/') ? url.slice(1) : url)
      ];

      let sizeBytes = 0;
      for (const cp of candidatePaths) {
        if (fs.existsSync(cp)) {
          try {
            sizeBytes = fs.statSync(cp).size;
            break;
          } catch {}
        }
      }

      itemsMap.set(url, {
        id: tm.id,
        url,
        name: fileName,
        sizeBytes,
        createdAt: tm.createdAt ? tm.createdAt.toISOString() : new Date().toISOString(),
        category: 'tickets'
      });
    }

    // 5. Scan disk files in uploads/tenants/${tenantId} (for chat media and direct uploads)
    const tenantDir = path.join(this.uploadDir, 'tenants', tenantId);
    if (fs.existsSync(tenantDir)) {
      const fileNames = fs.readdirSync(tenantDir);
      for (const fileName of fileNames) {
        const filePath = path.join(tenantDir, fileName);
        if (!fs.existsSync(filePath)) continue;

        const publicUrl = `/uploads/tenants/${tenantId}/${fileName}`;
        if (itemsMap.has(publicUrl)) continue;

        try {
          const stats = fs.statSync(filePath);
          itemsMap.set(publicUrl, {
            id: publicUrl,
            url: publicUrl,
            name: fileName,
            sizeBytes: stats.size,
            createdAt: stats.birthtime ? stats.birthtime.toISOString() : stats.mtime.toISOString(),
            category: 'chatMedia'
          });
        } catch (err) {
          this.logger.warn(`Error statting file ${fileName}: ${err.message}`);
        }
      }
    }

    // 6. Scan chat media messages from DB (to catch files stored in /uploads/media/ or other legacy paths)
    for (const msg of chatMessages) {
      let mediaUrl: string | undefined;
      const content = msg.content as any;

      if (typeof content === 'object' && content !== null) {
        mediaUrl = content.mediaUrl || content.url || content.fileUrl || content.localUrl;
      } else if (typeof content === 'string') {
        if (content.startsWith('/uploads/')) {
          mediaUrl = content;
        } else {
          try {
            const parsed = JSON.parse(content);
            if (typeof parsed === 'object' && parsed !== null) {
              mediaUrl = parsed.mediaUrl || parsed.url || parsed.fileUrl || parsed.localUrl;
            }
          } catch {}
        }
      }

      if (!mediaUrl || !mediaUrl.startsWith('/uploads/')) continue;
      if (itemsMap.has(mediaUrl)) continue; // Already counted

      const fileName = mediaUrl.split('/').pop() || `chat_file_${msg.id}`;
      const candidatePaths = [
        path.join(process.cwd(), mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl),
        path.join(this.uploadDir, fileName),
        path.join(this.uploadDir, 'media', fileName),
        path.join(this.uploadDir, 'tenants', tenantId, fileName),
        path.join(this.uploadDir, 'products', fileName)
      ];

      let sizeBytes = 0;
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            sizeBytes = fs.statSync(p).size;
            break;
          } catch (e) {}
        }
      }

      const category = mediaUrl.includes('/products/') ? 'products' : 'chatMedia';

      itemsMap.set(mediaUrl, {
        id: mediaUrl,
        url: mediaUrl,
        name: fileName,
        sizeBytes,
        createdAt: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
        category
      });
    }

    return Array.from(itemsMap.values());
  }
}
