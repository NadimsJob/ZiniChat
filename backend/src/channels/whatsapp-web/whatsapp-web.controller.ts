import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { WhatsappWebService } from './whatsapp-web.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('whatsapp-web')
export class WhatsappWebController {
  constructor(private readonly whatsappWebService: WhatsappWebService) {}

  @Post('start-pairing')
  async startPairing(@Req() req: any, @Body() body: { phoneNumber: string }) {
    const tenantId = req.user.tenantId;
    const code = await this.whatsappWebService.startPairing(tenantId, body.phoneNumber);
    return { pairingCode: code };
  }

  @Post('start-qr')
  async startQr(@Req() req: any) {
    const tenantId = req.user.tenantId;
    await this.whatsappWebService.startQr(tenantId);
    return { success: true };
  }
}
