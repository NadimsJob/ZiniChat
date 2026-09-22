import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { FeatureRolloutService } from './feature-rollout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('feature-rollout')
@UseGuards(JwtAuthGuard)
export class FeatureRolloutController {
  constructor(private readonly featureRolloutService: FeatureRolloutService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  async getAllRollouts() {
    return this.featureRolloutService.getAllRollouts();
  }

  @Get(':key/tenants')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  async getTenantRollouts(@Param('key') key: string) {
    return this.featureRolloutService.getTenantRollouts(key);
  }

  @Patch(':key/global')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  async setGlobalStatus(@Param('key') key: string, @Body('isGlobal') isGlobal: boolean) {
    await this.featureRolloutService.setGlobalStatus(key, isGlobal);
    return { success: true };
  }

  @Patch(':key/tenants/:tenantId')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  async setTenantStatus(
    @Param('key') key: string,
    @Param('tenantId') tenantId: string,
    @Body('isEnabled') isEnabled: boolean
  ) {
    if (isEnabled) {
      await this.featureRolloutService.enableForTenant(key, tenantId);
    } else {
      await this.featureRolloutService.disableForTenant(key, tenantId);
    }
    return { success: true };
  }

  // Public/tenant endpoint to check a flag
  @Get(':key/check')
  async checkFeatureFlag(@Param('key') key: string, @Request() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId && req.user.role === 'superadmin') {
       return { enabled: true };
    }
    if (!tenantId) {
      return { enabled: false };
    }
    const enabled = await this.featureRolloutService.isFeatureEnabled(tenantId, key);
    return { enabled };
  }
}
