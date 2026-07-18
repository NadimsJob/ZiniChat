import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CurrencyService {
  constructor(private prisma: PrismaService) {}

  async create(data: { rate: number; effectiveDate: string; createdBy?: string }) {
    return this.prisma.exchangeRate.create({
      data: {
        rate: data.rate,
        effectiveDate: new Date(data.effectiveDate),
        createdBy: data.createdBy || null,
      },
    });
  }

  async findAll() {
    return this.prisma.exchangeRate.findMany({
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async getCurrentRate() {
    const now = new Date();
    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        effectiveDate: { lte: now },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!rate) {
      return {
        rate: 121.0,
        fromCurrency: 'USD',
        toCurrency: 'BDT',
        effectiveDate: now,
        isFallback: true,
      };
    }

    return {
      ...rate,
      isFallback: false,
    };
  }
}
