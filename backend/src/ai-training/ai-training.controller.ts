import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiTrainingService } from './ai-training.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSystemPromptDto } from './dto/update-system-prompt.dto';
import { CreateQnaDto, UpdateQnaDto } from './dto/qna.dto';
import { UpdateToolDto } from './dto/tool-config.dto';

@Controller('ai-training')
@UseGuards(JwtAuthGuard)
export class AiTrainingController {
  constructor(private readonly aiTrainingService: AiTrainingService) {}

  @Get('config')
  async getConfig(@Request() req: any) {
    return this.aiTrainingService.getConfig(req.user.tenantId);
  }

  @Patch('prompt')
  async updateSystemPrompt(@Request() req: any, @Body() dto: UpdateSystemPromptDto) {
    return this.aiTrainingService.updateSystemPrompt(req.user.tenantId, dto.systemPrompt);
  }

  @Get('generate-sample-prompt')
  async generateSamplePrompt(@Request() req: any) {
    return this.aiTrainingService.generateSamplePrompt(req.user.tenantId);
  }

  @Get('tools')
  async getTools(@Request() req: any) {
    return this.aiTrainingService.getTools(req.user.tenantId);
  }

  @Patch('tools/:toolType')
  async updateTool(
    @Request() req: any,
    @Param('toolType') toolType: string,
    @Body() dto: UpdateToolDto
  ) {
    return this.aiTrainingService.updateTool(req.user.tenantId, toolType, dto.isEnabled, dto.configJson);
  }

  @Post('config/byok')
  async updateByokConfig(
    @Request() req: any, 
    @Body() data: { routingMode: string; apiKey?: string; aiOrderEnabled?: boolean; isActive?: boolean; replyWhenAssigned?: boolean; agentName?: string }
  ) {
    return this.aiTrainingService.updateByokConfig(
      req.user.tenantId, 
      data.routingMode, 
      data.apiKey, 
      data.aiOrderEnabled, 
      data.isActive, 
      data.replyWhenAssigned, 
      data.agentName
    );
  }

  @Get('qna')
  async getQnaList(@Request() req: any) {
    return this.aiTrainingService.getQnaList(req.user.tenantId);
  }

  @Post('qna')
  async createQna(@Request() req: any, @Body() dto: CreateQnaDto) {
    return this.aiTrainingService.createCustomQna(req.user.tenantId, dto.question, dto.answer);
  }

  @Patch('qna/:id')
  async updateQna(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateQnaDto) {
    return this.aiTrainingService.updateQna(req.user.tenantId, id, dto.question, dto.answer);
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

  @Post('test-simulate')
  async testSimulate(@Request() req: any, @Body('message') message: string) {
    return this.aiTrainingService.testSimulate(req.user.tenantId, message);
  }
}
