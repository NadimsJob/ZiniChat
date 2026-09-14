import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import * as fs from 'fs';
import { WebsiteWidgetService } from './website-widget.service';
import type { CreateWidgetDto } from './website-widget.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('website-widget')
export class WebsiteWidgetController {
  constructor(private readonly widgetService: WebsiteWidgetService) {}

  // Authenticated: Create widget (quota enforced inside service)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateWidgetDto) {
    return this.widgetService.createWidget(req.user.tenantId, dto);
  }

  // Authenticated: Get tenant's widgets
  @UseGuards(JwtAuthGuard)
  @Get('my')
  list(@Req() req: any) {
    return this.widgetService.getWidgets(req.user.tenantId);
  }

  // Authenticated: Upload custom widget icon image
  @UseGuards(JwtAuthGuard)
  @Post('upload-icon')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = join(process.cwd(), 'uploads', 'widget');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      }
    })
  }))
  async uploadIcon(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Icon image file is required');
    try {
      fs.chmodSync(file.path, 0o644);
    } catch (e) {}
    const iconUrl = `/uploads/widget/${file.filename}`;
    return { iconUrl };
  }

  // Authenticated: Update widget settings
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateWidgetDto>) {
    return this.widgetService.updateWidget(req.user.tenantId, id, dto);
  }

  // Authenticated: Delete (soft-delete) a widget
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.widgetService.deleteWidget(req.user.tenantId, id);
  }

  // Public: Fetch widget config by token (for embed SDK)
  @Get('public/:token')
  getPublic(@Param('token') token: string) {
    return this.widgetService.getWidgetByToken(token);
  }
}
