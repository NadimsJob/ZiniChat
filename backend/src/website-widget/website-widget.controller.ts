import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WebsiteWidgetService } from './website-widget.service';
import type { CreateWidgetDto } from './website-widget.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('website-widget')
export class WebsiteWidgetController {
  constructor(private readonly widgetService: WebsiteWidgetService) {}

  // Authenticated: Create widget (quota enforced inside service)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateWidgetDto) {
    return this.widgetService.createWidget(req.user.tenantId, dto);
  }

  // Authenticated: Get tenant's widgets
  @UseGuards(JwtAuthGuard)
  @Get('my')
  list(@Req() req: any) {
    return this.widgetService.getWidgets(req.user.tenantId);
  }

  // Authenticated: Update widget settings
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateWidgetDto>) {
    return this.widgetService.updateWidget(req.user.tenantId, id, dto);
  }

  // Authenticated: Delete (soft-delete) a widget
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.widgetService.deleteWidget(req.user.tenantId, id);
  }

  // Public: Fetch widget config by token (for embed SDK)
  @Get('public/:token')
  getPublic(@Param('token') token: string) {
    return this.widgetService.getWidgetByToken(token);
  }
}
