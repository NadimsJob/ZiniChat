import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}
