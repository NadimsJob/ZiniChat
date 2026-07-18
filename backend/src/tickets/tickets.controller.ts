import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async getTickets(@Request() req: any) {
    return this.ticketsService.getTickets(req.user);
  }

  @Get(':id')
  async getTicket(@Param('id') id: string, @Request() req: any) {
    if (id === 'admins') {
      return this.ticketsService.getAdmins(req.user);
    }
    return this.ticketsService.getTicket(id, req.user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'tickets');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `ticket_${uniqueSuffix}${ext}`);
      }
    })
  }))
  async createTicket(
    @Request() req: any,
    @Body() body: { subject: string, type: string, priority: string, message: string },
    @UploadedFile() file: Express.Multer.File
  ) {
    const attachmentUrl = file ? `/uploads/tickets/${file.filename}` : undefined;
    return this.ticketsService.createTicket(req.user.tenantId, req.user.id, body.subject, body.type || 'General', body.priority || 'medium', body.message, attachmentUrl);
  }

  @Post(':id/messages')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'tickets');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `msg_${uniqueSuffix}${ext}`);
      }
    })
  }))
  async addMessage(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { message: string },
    @UploadedFile() file: Express.Multer.File
  ) {
    const attachmentUrl = file ? `/uploads/tickets/${file.filename}` : undefined;
    return this.ticketsService.addMessage(id, req.user, body.message, attachmentUrl);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.ticketsService.updateStatus(id, body.status, req.user);
  }

  @Patch(':id/assign')
  async assignTicket(@Param('id') id: string, @Body() body: { assignedToId: string | null }, @Request() req: any) {
    return this.ticketsService.assignTicket(id, body.assignedToId, req.user);
  }
}
