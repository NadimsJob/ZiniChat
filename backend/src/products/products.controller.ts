import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { QuotaService } from '../tenants/quota.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

const imageStorageOptions = diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadDir = join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  }
});

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly quotaService: QuotaService
  ) {}

  @Get()
  async getProducts(@Request() req: any) {
    return this.productsService.getProducts(req.user.tenantId);
  }

  // ── Permanent Dynamic Field Definitions ────────────────────
  @Get('custom-fields')
  async getCustomFieldDefs(@Request() req: any) {
    return this.productsService.getCustomFieldDefs(req.user.tenantId);
  }

  @Post('custom-fields')
  async saveCustomFieldDef(@Request() req: any, @Body() body: any) {
    if (!body.name || !body.name.trim()) throw new BadRequestException('Field name is required');
    return this.productsService.saveCustomFieldDef(req.user.tenantId, body);
  }

  @Delete('custom-fields/:name')
  async deleteCustomFieldDef(@Request() req: any, @Param('name') name: string) {
    return this.productsService.deleteCustomFieldDef(req.user.tenantId, name);
  }

  @Post()
  async createProduct(@Request() req: any, @Body() body: any) {
    return this.productsService.createProduct(req.user.tenantId, body);
  }

  @Patch(':id')
  async updateProduct(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.productsService.updateProduct(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async deleteProduct(@Request() req: any, @Param('id') id: string) {
    return this.productsService.deleteProduct(req.user.tenantId, id);
  }

  // ── Single image upload (eCommerce / main image) ──
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorageOptions }))
  async uploadImage(@Request() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Image file is required');
    const imageUrl = `/uploads/products/${file.filename}`;
    if (file.size) {
      await this.quotaService.incrementStorage(req.user.tenantId, file.size);
    }
    return this.productsService.updateProduct(req.user.tenantId, id, { imageUrl });
  }

  // ── Property Gallery: add image to images[] array ──
  @Post(':id/gallery')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorageOptions }))
  async addGalleryImage(@Request() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Image file is required');
    const imageUrl = `/uploads/products/${file.filename}`;
    if (file.size) {
      await this.quotaService.incrementStorage(req.user.tenantId, file.size);
    }
    return this.productsService.addGalleryImage(req.user.tenantId, id, imageUrl);
  }

  // ── Property Gallery: remove image at index from images[] array ──
  @Delete(':id/gallery/:index')
  async removeGalleryImage(
    @Request() req: any,
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number
  ) {
    return this.productsService.removeGalleryImage(req.user.tenantId, id, index);
  }
}
