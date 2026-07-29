import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { MetaPixelService } from './meta-pixel.service';
import { MetaPixelProcessor } from './meta-pixel.processor';
import { MetaPixelController } from './meta-pixel.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'meta-pixel',
    }),
  ],
  controllers: [MetaPixelController],
  providers: [MetaPixelService, MetaPixelProcessor],
  exports: [MetaPixelService, BullModule],
})
export class MetaPixelModule {}
