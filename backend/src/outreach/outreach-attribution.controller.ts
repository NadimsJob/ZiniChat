import { Controller, Get, Post, Query, Body, Res } from '@nestjs/common';
import { OutreachAttributionService, UnsubscribeDto } from './outreach-attribution.service';

@Controller(['api/outreach', 'outreach', 'api/public/outreach'])
export class OutreachAttributionController {
  constructor(private readonly attributionService: OutreachAttributionService) {}

  /**
   * 1x1 Transparent Open Rate Tracking Pixel
   */
  @Get('open')
  async trackOpen(@Query('token') token: string, @Res() res: any) {
    const gifBuffer = await this.attributionService.recordOpen(token);

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', gifBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.end(gifBuffer);
  }

  /**
   * Smart Redirect & Click Capture
   */
  @Get('click')
  async trackClick(
    @Query('token') token: string,
    @Query('dest') dest: string,
    @Res() res: any,
  ) {
    const { destinationUrl } = await this.attributionService.recordClick(token, dest);

    // Set 30-day attribution cookie
    res.cookie('zinichat_outreach_lead', token, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    });

    return res.redirect(destinationUrl);
  }

  /**
   * Public Unsubscribe Web Redirect
   */
  @Get('unsubscribe')
  async unsubscribePage(@Query('token') token: string, @Res() res: any) {
    const baseUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'https://zinichat.com').replace(/\/$/, '');
    return res.redirect(`${baseUrl}/unsubscribe?token=${token || ''}`);
  }

  /**
   * Public Unsubscribe Handler (API)
   */
  @Post(['unsubscribe', 'public/unsubscribe'])
  async submitUnsubscribe(@Body() dto: UnsubscribeDto) {
    return this.attributionService.unsubscribeProspect(dto?.token, dto?.reason, dto?.feedback);
  }

  /**
   * Inbound Web Widget Prospect Information
   */
  @Get(['prospect-info', 'public/prospect-info'])
  async getProspectInfo(@Query('token') token: string) {
    return this.attributionService.getProspectInfo(token);
  }
}
