import { Module } from '@nestjs/common';
import { WebsiteWidgetService } from './website-widget.service';
import { WebsiteWidgetController } from './website-widget.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WebsiteWidgetController],
  providers: [WebsiteWidgetService],
  exports: [WebsiteWidgetService],
})
export class WebsiteWidgetModule {}
