import { Controller, Get, Post, Delete, Body, Query, UseGuards, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { GoogleAnalyticsService } from './google-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('google-analytics')
export class GoogleAnalyticsController {
  private readonly logger = new Logger(GoogleAnalyticsController.name);

  constructor(
    private readonly gaService: GoogleAnalyticsService,
    @InjectQueue('google-analytics') private readonly gaQueue: Queue,
  ) {}

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async getConfig() {
    const config = await this.gaService.getConfig();

    let maskedSecret = null;
    if (config.apiSecret) {
      const decrypted = this.gaService.decrypt(config.apiSecret);
      if (decrypted && decrypted.length > 4) {
        maskedSecret = '*'.repeat(decrypted.length - 4) + decrypted.slice(-4);
      } else {
        maskedSecret = '****';
      }
    }

    return {
      id: config.id,
      measurementId: config.measurementId,
      isActive: config.isActive,
      trackPageView: config.trackPageView,
      trackSignup: config.trackSignup,
      trackCompleteReg: config.trackCompleteReg,
      trackLogin: config.trackLogin,
      setupCompletedAt: config.setupCompletedAt,
      lastTestedAt: config.lastTestedAt,
      testResult: config.testResult,
      hasApiSecret: Boolean(config.apiSecret),
      maskedApiSecret: maskedSecret,
    };
  }

  @Post('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async saveConfig(@Body() body: any) {
    const updated = await this.gaService.saveConfig(body);
    return {
      success: true,
      message: 'Google Analytics configuration saved successfully',
      config: {
        measurementId: updated.measurementId,
        isActive: updated.isActive,
        setupCompletedAt: updated.setupCompletedAt,
      },
    };
  }

  @Post('test-connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async testConnection() {
    return this.gaService.testConnection();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async getStats() {
    return this.gaService.getStatsLast24h();
  }

  @Get('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async getEvents(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.gaService.getEventLogs(Number(page), Number(limit));
  }

  @Delete('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async resetConfig() {
    await this.gaService.resetConfig();
    return { success: true, message: 'Google Analytics configuration reset successfully' };
  }

  // Public internal endpoint called by frontend Next.js proxy route /api/ga/track
  @Post('acquisition/track')
  @HttpCode(HttpStatus.OK)
  async trackAcquisitionEvent(@Body() body: any) {
    const { eventName, eventParams, tenantId, tenantEmail, clientId } = body;
    if (!eventName) {
      return { success: false, message: 'eventName is required' };
    }

    try {
      await this.gaQueue.add(
        'sendGAEvent',
        {
          eventName,
          eventParams: eventParams || {},
          tenantId,
          tenantEmail,
          clientId,
        },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        },
      );

      return { success: true, message: `GA event '${eventName}' queued successfully` };
    } catch (err: any) {
      this.logger.error(`Error queueing GA acquisition event: ${err.message}`);
      return { success: false, message: err.message };
    }
  }
}
