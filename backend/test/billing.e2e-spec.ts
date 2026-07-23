import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { BillingService } from '../src/billing/billing.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';

describe('BillingController (e2e)', () => {
  let app: INestApplication<App>;
  let billingService = {
    getSubscriptions: jest.fn().mockResolvedValue([{ id: 'sub1' }]),
    getPayments: jest.fn().mockResolvedValue([{ id: 'pay1' }]),
    getTenantQuotas: jest.fn().mockResolvedValue({ messageQuota: 500 }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BillingService)
      .useValue(billingService)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'u1', role: 'superadmin', tenantId: 't1', permissions: ['manage:billing'] };
          return true;
      }})
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/billing/subscriptions (GET)', () => {
    return request(app.getHttpServer())
      .get('/billing/subscriptions')
      .expect(200)
      .expect([{ id: 'sub1' }]);
  });

  it('/billing/payments (GET)', () => {
    return request(app.getHttpServer())
      .get('/billing/payments')
      .expect(200)
      .expect([{ id: 'pay1' }]);
  });

  it('/billing/quotas (GET)', () => {
    return request(app.getHttpServer())
      .get('/billing/quotas')
      .expect(200)
      .expect({ messageQuota: 500 });
  });
});
