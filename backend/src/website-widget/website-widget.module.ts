import { Module, forwardRef } from '@nestjs/common';
import { WebsiteWidgetService } from './website-widget.service';
import { WebsiteWidgetController } from './website-widget.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InboxModule } from '../inbox/inbox.module';
import { CapiHubModule } from '../capi-hub/capi-hub.module';

@Module({
  imports: [PrismaModule, CapiHubModule, forwardRef(() => InboxModule)],
  controllers: [WebsiteWidgetController],
  providers: [WebsiteWidgetService],
  exports: [WebsiteWidgetService],
})
export class WebsiteWidgetModule {}
