import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TenantTeamController } from './tenant-team.controller';
import { TenantTeamService } from './tenant-team.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SmtpModule } from '../smtp/smtp.module';

@Module({
  imports: [PrismaModule, SmtpModule],
  controllers: [TeamController, TenantTeamController],
  providers: [TeamService, TenantTeamService]
})
export class TeamModule {}
