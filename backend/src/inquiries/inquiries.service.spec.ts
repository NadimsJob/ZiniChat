import { Test, TestingModule } from '@nestjs/testing';
import { InquiriesService } from './inquiries.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmtpService } from '../smtp/smtp.service';

describe('InquiriesService', () => {
  let service: InquiriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiriesService,
        { provide: PrismaService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: SmtpService, useValue: {} },
      ],
    }).compile();

    service = module.get<InquiriesService>(InquiriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
