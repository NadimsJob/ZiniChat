import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, Headers, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { CapiHubService } from './capi-hub.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Controller('capi-hub')
export class CapiHubController {
  constructor(
    private readonly capiHubService: CapiHubService,
    private readonly prisma: PrismaService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('integration')
  async createIntegration(@Req() req: any, @Body() data: { pixelId: string; accessToken: string; datasetId?: string; testEventCode?: string }) {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') throw new ForbiddenException();
    return this.capiHubService.createOrUpdateIntegration(req.user.tenantId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('integration')
  async getIntegration(@Req() req: any) {
    return this.capiHubService.getIntegration(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['events/config', 'event-configs'])
  async getEventConfigs(@Req() req: any) {
    return this.capiHubService.getEventConfigs(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(['events/config/:eventName', 'event-configs/:eventName'])
  async updateEventConfig(@Req() req: any, @Param('eventName') eventName: string, @Body() data: any) {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') throw new ForbiddenException();
    return this.capiHubService.updateEventConfig(req.user.tenantId, eventName, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['events/logs', 'logs'])
  async getLogs(@Req() req: any) {
    return this.capiHubService.getEventLogs(req.user.tenantId);
  }

  // Public webhook endpoint for external services
  @Post('webhook/:webhookToken')
  async handleWebhook(
    @Param('webhookToken') webhookToken: string,
    @Headers('x-zinichat-secret') secret: string,
    @Body() payload: any
  ) {
    if (!secret) throw new UnauthorizedException('Missing secret header');

    const integration = await this.prisma.tenantCapiIntegration.findUnique({
      where: { webhookToken }
    });

    if (!integration || !integration.isActive) {
      throw new UnauthorizedException('Invalid or inactive integration');
    }

    const isValid = await bcrypt.compare(secret, integration.webhookSecret);
    if (!isValid) throw new UnauthorizedException('Invalid secret');

    const eventName = payload.event_name;
    if (!eventName) throw new Error('Missing event_name in payload');

    await this.capiHubService.fireEvent(integration.tenantId, eventName, payload, 'webhook');
    return { success: true };
  }
}
