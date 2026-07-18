import { Module } from '@nestjs/common';
import { LandingPageController } from './landing-page.controller';
import { LandingPageService } from './landing-page.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LandingPageController],
  providers: [LandingPageService]
})
export class LandingPageModule {}
