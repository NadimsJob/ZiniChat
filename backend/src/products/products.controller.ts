import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

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

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/uploads/products',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      }
    })
  }))
  async uploadImage(@Request() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Image file is required');
    const imageUrl = `/uploads/products/${file.filename}`;
    return this.productsService.updateProduct(req.user.tenantId, id, { imageUrl });
  }
}
