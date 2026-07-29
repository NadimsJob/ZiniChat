import { Test, TestingModule } from '@nestjs/testing';
import { LandingPageService } from './landing-page.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LandingPageService', () => {
  let service: LandingPageService;
  let prisma: any;

  const mockPrisma = {
    landingPageConfig: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingPageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LandingPageService>(LandingPageService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return existing landing page config if present', async () => {
      const mockConfig = {
        id: 'cfg-1',
        heroTitle: 'Test Title',
        contactInfo: {
          address: { en: '#386, Uttar Badda, Dhaka-1212, Bangladesh', bn: '#৩৮৬, উত্তর বাড্ডা, ঢাকা-১২১২, বাংলাদেশ' },
          email: 'info@zinichat.com',
          phone: '01533894967',
        },
      };
      mockPrisma.landingPageConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getConfig();
      expect(result).toEqual(mockConfig);
    });

    it('should create and return default config if none exists', async () => {
      mockPrisma.landingPageConfig.findFirst.mockResolvedValue(null);
      mockPrisma.landingPageConfig.create.mockResolvedValue({ id: 'cfg-def', heroTitle: 'Supercharge Your Business with AI' });

      const result = await service.getConfig();
      expect(mockPrisma.landingPageConfig.create).toHaveBeenCalled();
      expect(result.heroTitle).toBe('Supercharge Your Business with AI');
    });
  });
});
