import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Req, BadRequestException, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('storage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @RequirePermissions('manage:contacts') // A general permission to allow users to upload, or customize this
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf|doc|docx|csv|xlsx)$/)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Unsupported file type'), false);
      }
    }
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is missing from user context');
    }

    const url = await this.storageService.uploadMedia(file, tenantId);
    
    return {
      success: true,
      url,
      originalName: file.originalname,
      mimeType: file.mimetype
    };
  }

  @Post('cleanup')
  @RequirePermissions('manage:contacts')
  async cleanupStorage(@Body('urls') urls: string[], @Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is missing from user context');
    }

    if (!Array.isArray(urls)) {
      throw new BadRequestException('urls must be an array of strings');
    }

    let deletedCount = 0;
    for (const url of urls) {
      const deleted = await this.storageService.deleteMedia(url, tenantId);
      if (deleted) deletedCount++;
    }

    return { success: true, deletedCount };
  }
}
