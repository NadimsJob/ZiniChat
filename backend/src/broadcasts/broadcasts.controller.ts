import { Controller, Get, Post, Delete, Body, UseGuards, Request, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
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

  // --- Superadmin Endpoints (Read-Only Monitoring) ---
  @Get('admin/templates')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  getAllTemplatesForAdmin() {
    return this.broadcastsService.getAllTemplatesForAdmin();
  }
}
