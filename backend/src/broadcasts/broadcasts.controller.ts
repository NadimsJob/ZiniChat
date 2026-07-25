import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Request, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BroadcastsService } from './broadcasts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Get('templates')
  getTemplates(@Request() req: any) {
    return this.broadcastsService.getTemplates(req.user.tenantId);
  }

  @Post('templates')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(16)
            .fill(null)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 16 * 1024 * 1024 } // 16MB max
    })
  )
  createTemplate(
    @Request() req: any,
    @Body() data: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.broadcastsService.createTemplate(req.user.tenantId, data, file);
  }

  @Delete('templates/:id')
  deleteTemplate(@Request() req: any, @Param('id') id: string) {
    return this.broadcastsService.deleteTemplate(req.user.tenantId, id);
  }

  @Get()
  getBroadcasts(@Request() req: any) {
    return this.broadcastsService.getBroadcasts(req.user.tenantId);
  }

  @Post()
  createBroadcast(@Request() req: any, @Body() data: any) {
    return this.broadcastsService.createBroadcast(req.user.tenantId, data);
  }

  // ============================================================
  // GLOBAL TEMPLATE LIBRARY — TENANT-FACING (no feature gate for browse)
  // ============================================================

  @Get('library')
  getGlobalTemplates(
    @Query('categoryTag') categoryTag?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.broadcastsService.getGlobalTemplates({ categoryTag, category, search });
  }

  @Post('library/import')
  importFromLibrary(@Request() req: any, @Body() data: { globalTemplateId: string; customName: string }) {
    return this.broadcastsService.importFromLibrary(req.user.tenantId, data);
  }

  // ============================================================
  // SUPERADMIN MONITORING + GLOBAL LIBRARY MANAGEMENT
  // ============================================================

  @Get('admin/templates')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  getAllTemplatesForAdmin() {
    return this.broadcastsService.getAllTemplatesForAdmin();
  }

  @Get('admin/library')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  getGlobalTemplatesForAdmin() {
    return this.broadcastsService.getGlobalTemplatesForAdmin();
  }

  @Post('admin/library')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  createGlobalTemplate(@Body() data: any) {
    return this.broadcastsService.createGlobalTemplate(data);
  }

  @Post('admin/library/:id/promote')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  promoteToGlobalLibrary(@Param('id') id: string, @Body() data: { title: string; categoryTag: string; isFeatured?: boolean }) {
    return this.broadcastsService.promoteToGlobalLibrary(id, data);
  }

  @Patch('admin/library/:id')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  updateGlobalTemplate(@Param('id') id: string, @Body() data: any) {
    return this.broadcastsService.updateGlobalTemplate(id, data);
  }

  @Delete('admin/library/:id')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  deleteGlobalTemplate(@Param('id') id: string) {
    return this.broadcastsService.deleteGlobalTemplate(id);
  }
}

