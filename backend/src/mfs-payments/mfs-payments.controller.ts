import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { MfsPaymentsService } from './mfs-payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('mfs-payments')
export class MfsPaymentsController {
  constructor(private readonly mfsPaymentsService: MfsPaymentsService) {}

  // 1. MFS Accounts Management (Superadmin Only)
  @Get('accounts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants') // Or appropriate billing permission
  async getAccounts() {
    return this.mfsPaymentsService.getAccounts();
  }

  @Get('active-providers')
  @UseGuards(JwtAuthGuard)
  async getActiveProviders() {
    return this.mfsPaymentsService.getActiveAccounts();
  }

  @Post('accounts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async createAccount(@Body() data: {
    provider: string;
    accountType: string;
    number: string;
    merchantId?: string;
    bankName?: string;
    routingNumber?: string;
    qrCodeUrl?: string;
    chargePercent?: number;
    isActive?: boolean;
  }) {
    return this.mfsPaymentsService.createAccount(data);
  }

  @Patch('accounts/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async updateAccount(
    @Param('id') id: string,
    @Body() data: {
      provider?: string;
      accountType?: string;
      number?: string;
      merchantId?: string;
      bankName?: string;
      routingNumber?: string;
      qrCodeUrl?: string;
      chargePercent?: number;
      isActive?: boolean;
    },
  ) {
    return this.mfsPaymentsService.updateAccount(id, data);
  }

  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async removeAccount(@Param('id') id: string) {
    return this.mfsPaymentsService.removeAccount(id);
  }

  // 2. SMS Gateway Webhook
  @Post('sms-webhook')
  async syncSmsTransaction(
    @Headers('x-sms-gateway-api-key') apiKey: string,
    @Body() body: {
      trxId: string;
      provider: string;
      accountType?: string;
      amount: number;
      senderNumber?: string;
      smsBody: string;
    },
  ) {
    return this.mfsPaymentsService.syncSmsTransaction(apiKey, body);
  }

  // 3. User Payment Verification
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyUserPayment(
    @Req() req: any,
    @Body() body: { paymentId: string; trxId?: string },
  ) {
    return this.mfsPaymentsService.verifyPayment(req.user.id, req.user.tenantId, body.paymentId, body.trxId);
  }

  // 4. Payment Checkout QR Payload
  @Get('qr-payload/:paymentId')
  @UseGuards(JwtAuthGuard)
  async getPaymentQrPayload(
    @Param('paymentId') paymentId: string,
    @Query('provider') provider?: string,
  ) {
    return this.mfsPaymentsService.getPaymentQrPayload(paymentId, provider);
  }

  // 5. Admin Transactions Log
  @Get('transactions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async getTransactions() {
    return this.mfsPaymentsService.getTransactions();
  }

  // 6. Upload QR Code Image (Superadmin Only)
  @Post('accounts/:id/upload-qr')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = join(process.cwd(), 'uploads', 'mfs');
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
  async uploadQrCode(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('QR Image file is required');
    const qrCodeUrl = `/uploads/mfs/${file.filename}`;
    if (id === 'temp') {
      return { qrCodeUrl };
    }
    return this.mfsPaymentsService.updateAccount(id, { qrCodeUrl });
  }
}
