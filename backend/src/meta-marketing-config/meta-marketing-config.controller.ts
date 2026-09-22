import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { MetaMarketingConfigService } from './meta-marketing-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('meta-marketing-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class MetaMarketingConfigController {
  constructor(private readonly configService: MetaMarketingConfigService) {}

  @Get()
  async getConfig() {
    return this.configService.getConfig();
  }

  @Patch()
  async updateConfig(@Body() dto: any, @Req() req: any) {
    return this.configService.updateConfig(dto, req.user.userId);
  }

  @Get('test-connection')
  async testConnection() {
    return this.configService.testConnection();
  }

  @Get('tools')
  async getTools() {
    return this.configService.getEnabledTools();
  }

  @Patch('tools')
  async updateTool(@Body() dto: { toolKey: string; isEnabled: boolean }) {
    return this.configService.updateTool(dto.toolKey, dto.isEnabled);
  }
}
