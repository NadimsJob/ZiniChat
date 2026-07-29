import { Controller, Get, Post, Delete, Body, Query, UseGuards, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { MetaPixelService } from './meta-pixel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('meta-pixel')
export class MetaPixelController {
  private readonly logger = new Logger(MetaPixelController.name);

  constructor(
    private readonly metaPixelService: MetaPixelService,
    @InjectQueue('meta-pixel') private readonly metaPixelQueue: Queue,
  ) {}

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async getConfig() {
    const config = await this.metaPixelService.getPixelConfig();
    return {
      id: config.id,
      pixelId: config.pixelId,
      isActive: config.isActive,
      isCapiEnabled: config.isCapiEnabled,
      datasetId: config.datasetId,
      trackPageView: config.trackPageView,
      trackSignup: config.trackSignup,
      trackCompleteReg: config.trackCompleteReg,
      trackLogin: config.trackLogin,
      setupCompletedAt: config.setupCompletedAt,
      lastTestedAt: config.lastTestedAt,
      hasPixelToken: Boolean(config.pixelAccessToken),
      hasCapiToken: Boolean(config.capiAccessToken),
    };
  }

  @Post('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async saveConfig(@Body() body: any) {
    const updated = await this.metaPixelService.savePixelConfig(body);
    return {
      success: true,
      message: 'Meta Pixel configuration saved successfully',
      config: {
        pixelId: updated.pixelId,
        isActive: updated.isActive,
        isCapiEnabled: updated.isCapiEnabled,
        setupCompletedAt: updated.setupCompletedAt,
      },
    };
  }

  @Post('test-connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async testConnection() {
    return this.metaPixelService.testPixelConnection();
  }

  @Post('test-capi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async testCapi() {
    return this.metaPixelService.testCapiConnection();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async getStats() {
    return this.metaPixelService.getStatsLast24h();
  }

  @Get('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async getEvents(
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @Query('eventName') eventName?: string,
    @Query('search') search?: string,
  ) {
    return this.metaPixelService.getEventLogs(Number(limit), Number(offset), eventName, search);
  }

  @Delete('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async resetConfig() {
    await this.metaPixelService.resetPixelConfig();
    return { success: true, message: 'Meta Pixel configuration reset successfully' };
  }

  // Public internal route called by frontend Next.js API proxy route /api/acquisition/track
  @Post('acquisition/track')
  @HttpCode(HttpStatus.OK)
  async trackAcquisition(@Body() body: {
    eventName: string;
    tenantEmail?: string;
    tenantId?: string;
    fbClickId?: string;
    fbPageId?: string;
    customData?: any;
  }) {
    try {
      if (!body || !body.eventName) {
        return { success: false, message: 'Missing eventName' };
      }

      await this.metaPixelQueue.add('trackAcquisitionEvent', {
        eventName: body.eventName,
        tenantEmail: body.tenantEmail,
        tenantId: body.tenantId,
        fbClickId: body.fbClickId,
        fbPageId: body.fbPageId,
        customData: body.customData || {},
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      });

      return { success: true, message: 'Acquisition event queued' };
    } catch (err) {
      this.logger.error(`Error queueing acquisition tracking event: ${err.message}`);
      // Always return 200 OK so tracking never breaks user flows
      return { success: false, message: 'Failed to queue event silently' };
    }
  }
}
