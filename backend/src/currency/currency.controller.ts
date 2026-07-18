import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('currency')
export class CurrencyController {
  constructor(private currencyService: CurrencyService) {}

  // Only superadmin can set exchange rates
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  @Post('rates')
  create(@Request() req: any, @Body() body: any) {
    return this.currencyService.create({
      rate: body.rate,
      effectiveDate: body.effectiveDate,
      createdBy: req.user.userId,
    });
  }

  // Any authenticated user can view rates (for display purposes)
  @UseGuards(JwtAuthGuard)
  @Get('rates')
  findAll() {
    return this.currencyService.findAll();
  }

  // Public: needed by marketing/pricing page
  @Get('rates/current')
  getCurrentRate() {
    return this.currencyService.getCurrentRate();
  }
}
