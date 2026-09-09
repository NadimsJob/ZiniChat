import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { ClientBrandsService } from './client-brands.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('client-brands')
export class ClientBrandsController {
  constructor(private readonly clientBrandsService: ClientBrandsService) {}

  @Get('public')
  getPublicBrands() {
    return this.clientBrandsService.getPublicClientBrands();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  getAllBrands() {
    return this.clientBrandsService.getAllClientBrands();
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  createBrand(@Body() data: { name: string; logoUrl?: string; order?: number; isActive?: boolean }) {
    if (!data.name) {
      throw new BadRequestException('Brand name is required');
    }
    return this.clientBrandsService.createClientBrand(data);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  updateBrand(
    @Param('id') id: string,
    @Body() data: { name?: string; logoUrl?: string; order?: number; isActive?: boolean }
  ) {
    return this.clientBrandsService.updateClientBrand(id, data);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  deleteBrand(@Param('id') id: string) {
    return this.clientBrandsService.deleteClientBrand(id);
  }

  @Post('admin/upload-logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = join(process.cwd(), 'uploads', 'client-brands');
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
  async uploadLogo(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Logo image file is required');
    const logoUrl = `/uploads/client-brands/${file.filename}`;
    return { logoUrl };
  }
}
