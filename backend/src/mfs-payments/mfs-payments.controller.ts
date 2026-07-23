import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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

  // 2. Incoming Transactions logs (Superadmin Only)
  @Get('transactions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async getTransactions() {
    return this.mfsPaymentsService.getTransactions();
  }

  // Get QR payload for checkout page
  @Get('qr-payload/:paymentId')
  @UseGuards(JwtAuthGuard)
  async getPaymentQrPayload(
    @Param('paymentId') paymentId: string,
    @Query('provider') provider?: string,
  ) {
    return this.mfsPaymentsService.getPaymentQrPayload(paymentId, provider);
  }

  // 3. SMS Webhook Endpoint (Public, secured by header token)
  @Post('sms-webhook')
  async syncSmsTransaction(
    @Headers('X-SMS-GATEWAY-API-KEY') apiKey: string,
    @Body() data: {
      trxId: string;
      provider: string;
      accountType?: string;
      amount: number;
      senderNumber?: string;
      smsBody: string;
    },
  ) {
    return this.mfsPaymentsService.syncSmsTransaction(apiKey, data);
  }

  // 4. User Verification (Authenticated Tenants)
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @Req() req: any,
    @Body() data: {
      paymentId: string;
      trxId: string;
    },
  ) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    return this.mfsPaymentsService.verifyPayment(userId, tenantId, data.paymentId, data.trxId);
  }

  // 5. Superadmin Manual Claim (Superadmin Only)
  @Post('manual-claim')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async manualClaimTransaction(
    @Req() req: any,
    @Body() data: {
      trxId: string;
      paymentId: string;
    },
  ) {
    const userId = req.user.id;
    return this.mfsPaymentsService.manualClaimTransaction(userId, data.trxId, data.paymentId);
  }

  // 6. Upload QR Code Image (Superadmin Only)
  @Post('accounts/:id/upload-qr')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/uploads/mfs',
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
