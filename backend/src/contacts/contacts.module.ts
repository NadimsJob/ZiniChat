import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InboxModule } from '../inbox/inbox.module';
import { TenantsModule } from '../tenants/tenants.module';
import { FollowUpProcessor } from './follow-up.processor';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InboxModule),
    TenantsModule,
    BullModule.registerQueue({
      name: 'follow-up',
    }),
  ],
  controllers: [ContactsController],
  providers: [ContactsService, FollowUpProcessor],
  exports: [ContactsService],
})
export class ContactsModule {}
