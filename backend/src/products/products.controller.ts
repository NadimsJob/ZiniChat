import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

const imageStorageOptions = diskStorage({
  destination: './public/uploads/products',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  }
});

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts(@Request() req: any) {
    return this.productsService.getProducts(req.user.tenantId);
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
    return this.productsService.updateProduct(req.user.tenantId, id, { imageUrl });
  }

  // ── Property Gallery: add image to images[] array ──
  @Post(':id/gallery')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorageOptions }))
  async addGalleryImage(@Request() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Image file is required');
    const imageUrl = `/uploads/products/${file.filename}`;
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
