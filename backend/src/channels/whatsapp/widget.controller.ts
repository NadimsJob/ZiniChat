import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('widget')
export class WidgetController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('whatsapp/:tenantId/script.js')
  async getWidgetScript(@Param('tenantId') tenantId: string, @Res() res: Response) {
    try {
      // 1. Check tenant and plan
      const tenant: any = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { 
          plan: true,
          channelConns: {
            where: { channelType: 'whatsapp', status: 'active' },
            take: 1
          }
        }
      } as any);

      if (!tenant) {
        return res.status(404).send('console.error("ZiniChat: Tenant not found");');
      }

      // 2. Check if plan has the whatsapp_widget feature
      let hasWidgetFeature = false;
      if (tenant.plan && tenant.plan.features) {
        const features = tenant.plan.features as string[];
        if (Array.isArray(features) && features.includes('whatsapp_widget')) {
          hasWidgetFeature = true;
        }
      }

      if (!hasWidgetFeature) {
        return res.status(403).send('console.error("ZiniChat: WhatsApp Widget feature is not enabled for this plan.");');
      }

      // 3. Find connected number
      const connection = tenant.channelConns[0];
      if (!connection || !connection.phoneNumber) {
        return res.status(404).send('console.error("ZiniChat: No active WhatsApp connection found.");');
      }

      // Extract raw number for wa.me
      const phoneNumber = connection.phoneNumber.replace(/[^0-9]/g, '');

      // 4. Generate JS Script
      const scriptContent = `
(function() {
  var phoneNumber = "${phoneNumber}";
  var waUrl = "https://wa.me/" + phoneNumber;
  
  var styles = document.createElement('style');
  styles.innerHTML = \`
    .zinichat-wa-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      background-color: #25D366;
      border-radius: 50px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .zinichat-wa-widget:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 14px rgba(0,0,0,0.4);
    }
    .zinichat-wa-widget svg {
      width: 35px;
      height: 35px;
      fill: white;
    }
  \`;
  document.head.appendChild(styles);

  var widget = document.createElement('a');
  widget.className = 'zinichat-wa-widget';
  widget.href = waUrl;
  widget.target = '_blank';
  widget.innerHTML = '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 2a13 13 0 0 0-10.97 19.98l-1.57 5.72 5.86-1.54A12.96 12.96 0 0 0 16 28a13 13 0 0 0 0-26zm0 23.85a10.8 10.8 0 0 1-5.52-1.5l-.4-.24-3.55.93.95-3.46-.26-.41a10.82 10.82 0 1 1 8.78 4.68zm5.95-8.15c-.33-.16-1.92-.95-2.22-1.06-.3-.1-.52-.16-.73.16-.22.33-.85 1.06-1.04 1.28-.2.22-.39.25-.72.08-.33-.16-1.37-.5-2.61-1.6-1.05-.92-1.76-2.06-1.97-2.39-.2-.33-.02-.5.14-.67.15-.15.33-.39.5-.58.16-.2.22-.33.32-.55.1-.22.06-.41-.02-.58-.1-.16-.74-1.78-1.01-2.43-.27-.64-.54-.55-.73-.56-.19-.01-.4-.01-.62-.01-.22 0-.58.08-.88.41-.3.33-1.15 1.12-1.15 2.74s1.18 3.19 1.34 3.4c.16.22 2.32 3.54 5.62 4.96.79.34 1.4.54 1.88.7.79.25 1.51.21 2.08.13.63-.1 1.92-.78 2.19-1.54.27-.75.27-1.4.19-1.54-.08-.13-.3-.22-.63-.38z"/></svg>';

  document.body.appendChild(widget);
})();
      `;
      
      res.setHeader('Content-Type', 'application/javascript');
      return res.send(scriptContent);
    } catch (error) {
      console.error('Widget error:', error);
      return res.status(500).send('console.error("ZiniChat: Widget loading failed.");');
    }
  }
}
