import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiTrainingService } from './ai-training.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai-training')
@UseGuards(JwtAuthGuard)
export class AiTrainingController {
  constructor(private readonly aiTrainingService: AiTrainingService) {}

  @Get('config')
  async getConfig(@Request() req: any) {
    return this.aiTrainingService.getConfig(req.user.tenantId);
  }

  @Patch('prompt')
  async updateSystemPrompt(@Request() req: any, @Body() data: { systemPrompt: string }) {
    return this.aiTrainingService.updateSystemPrompt(req.user.tenantId, data.systemPrompt);
  }

  @Get('generate-sample-prompt')
  async generateSamplePrompt(@Request() req: any) {
    return this.aiTrainingService.generateSamplePrompt(req.user.tenantId);
  }

  @Post('config/byok')
  async updateByokConfig(@Request() req: any, @Body() data: { routingMode: string; apiKey?: string; aiOrderEnabled?: boolean; isActive?: boolean; replyWhenAssigned?: boolean }) {
    return this.aiTrainingService.updateByokConfig(req.user.tenantId, data.routingMode, data.apiKey, data.aiOrderEnabled, data.isActive, data.replyWhenAssigned);
  }

  @Get('qna')
  async getQnaList(@Request() req: any) {
    return this.aiTrainingService.getQnaList(req.user.tenantId);
  }

  @Post('qna')
  async createQna(@Request() req: any, @Body() data: { question: string; answer: string }) {
    return this.aiTrainingService.createCustomQna(req.user.tenantId, data.question, data.answer);
  }

  @Patch('qna/:id')
  async updateQna(@Request() req: any, @Param('id') id: string, @Body() data: { question?: string; answer?: string }) {
    return this.aiTrainingService.updateQna(req.user.tenantId, id, data.question, data.answer);
  }

  @Delete('qna/:id')
  async deleteQna(@Request() req: any, @Param('id') id: string) {
    return this.aiTrainingService.deleteQna(req.user.tenantId, id);
  }

  @Get('documents')
  async getDocuments(@Request() req: any) {
    return this.aiTrainingService.getDocuments(req.user.tenantId);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    return this.aiTrainingService.uploadDocument(req.user.tenantId, file);
  }

  @Delete('documents/:id')
  async deleteDocument(@Request() req: any, @Param('id') id: string) {
    return this.aiTrainingService.deleteDocument(req.user.tenantId, id);
  }
}
