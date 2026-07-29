import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let prisma: any;

  const mockPrisma: any = {
    exchangeRate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentRate', () => {
    it('should return latest active rate if present in DB', async () => {
      const mockRate = { id: 'r-1', rate: 122.5, effectiveDate: new Date() };
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(mockRate);

      const result = await service.getCurrentRate();
      expect(result).toMatchObject({ rate: 122.5, isFallback: false });
    });

    it('should return fallback rate 121.0 if no rate present in DB', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentRate();
      expect(result).toMatchObject({ rate: 121.0, isFallback: true, fromCurrency: 'USD', toCurrency: 'BDT' });
    });
  });

  describe('create', () => {
    it('should create new exchange rate', async () => {
      const mockRate = { id: 'r-2', rate: 123.0, effectiveDate: new Date('2026-07-29') };
      mockPrisma.exchangeRate.create.mockResolvedValue(mockRate);

      const result = await service.create({ rate: 123.0, effectiveDate: '2026-07-29' });
      expect(mockPrisma.exchangeRate.create).toHaveBeenCalled();
      expect(result.rate).toBe(123.0);
    });
  });
});
