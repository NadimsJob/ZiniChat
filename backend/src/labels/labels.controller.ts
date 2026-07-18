import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  async getLabels(@Request() req: any) {
    return this.labelsService.getLabels(req.user.tenantId);
  }

  @Post()
  async createLabel(@Request() req: any, @Body() body: { name: string; color: string; aiPrompt?: string }) {
    return this.labelsService.createLabel(req.user.tenantId, body);
  }

  @Patch(':id')
  async updateLabel(@Request() req: any, @Param('id') id: string, @Body() body: { name?: string; color?: string; aiPrompt?: string }) {
    return this.labelsService.updateLabel(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async deleteLabel(@Request() req: any, @Param('id') id: string) {
    return this.labelsService.deleteLabel(req.user.tenantId, id);
  }
}
