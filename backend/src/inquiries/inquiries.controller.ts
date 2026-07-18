import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  createInquiry(@Body() body: { name: string; email: string; message: string }) {
    return this.inquiriesService.createInquiry(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:site')
  getInquiries() {
    return this.inquiriesService.getInquiries();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:site')
  updateInquiryStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.inquiriesService.updateInquiryStatus(id, status);
  }
}
