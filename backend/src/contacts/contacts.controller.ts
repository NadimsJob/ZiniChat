import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard, RequireFeature } from '../auth/guards/feature.guard';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async getContacts(@Request() req: any) {
    return this.contactsService.getContacts(req.user.tenantId);
  }

  @Get(':id')
  async getContact(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.getContact(req.user.tenantId, id);
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_notes')
  @Get(':id/notes')
  async getContactNotes(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.getContactNotes(req.user.tenantId, id);
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_notes')
  @Post(':id/notes')
  async createContactNote(
    @Request() req: any,
    @Param('id') id: string,
    @Body('content') content: string
  ) {
    return this.contactsService.createContactNote(req.user.tenantId, id, content, req.user);
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_notes')
  @Delete(':id/notes/:noteId')
  async deleteContactNote(
    @Request() req: any,
    @Param('id') id: string,
    @Param('noteId') noteId: string
  ) {
    return this.contactsService.deleteContactNote(req.user.tenantId, id, noteId, req.user);
  }

  @Patch(':id')
  async updateContact(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.contactsService.updateContact(req.user.tenantId, id, body);
  }
}
