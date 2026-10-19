import { Test, TestingModule } from '@nestjs/testing';
import { TenantSmtpController } from './tenant-smtp.controller';
import { TenantSmtpService } from './tenant-smtp.service';

describe('TenantSmtpController', () => {
  let controller: TenantSmtpController;
  let service: jest.Mocked<Partial<TenantSmtpService>>;

  beforeEach(async () => {
    service = {
      getSmtpSetting: jest.fn().mockResolvedValue({
        id: 'smtp-1',
        host: 'smtp.gmail.com',
        port: 465,
        username: 'acme@gmail.com',
        hasPassword: true,
        isVerified: true,
      }),
      upsertSmtpSetting: jest.fn().mockResolvedValue({
        id: 'smtp-1',
        host: 'smtp.gmail.com',
        isVerified: false,
      }),
      verifySmtpConnection: jest.fn().mockResolvedValue({
        success: true,
        message: 'Verified successfully',
      }),
      deleteSmtpSetting: jest.fn().mockResolvedValue({
        success: true,
        message: 'Deleted successfully',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantSmtpController],
      providers: [
        {
          provide: TenantSmtpService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TenantSmtpController>(TenantSmtpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get smtp setting for authenticated tenant', async () => {
    const req = { user: { tenantId: 'tenant-123' } };
    const res = await controller.getSetting(req);
    expect(res).toBeDefined();
    expect(service.getSmtpSetting).toHaveBeenCalledWith('tenant-123');
  });

  it('should upsert smtp setting via POST', async () => {
    const req = { user: { tenantId: 'tenant-123', id: 'user-456' } };
    const dto = {
      host: 'smtp.gmail.com',
      port: 465,
      username: 'acme@gmail.com',
      password: 'pass',
      fromEmail: 'acme@gmail.com',
      fromName: 'Acme',
    };
    await controller.createOrUpdateSetting(req, dto);
    expect(service.upsertSmtpSetting).toHaveBeenCalledWith('tenant-123', dto, 'user-456');
  });

  it('should upsert smtp setting via PUT', async () => {
    const req = { user: { tenantId: 'tenant-123', userId: 'user-789' } };
    const dto = {
      host: 'smtp.gmail.com',
      port: 587,
      username: 'acme@gmail.com',
      fromEmail: 'acme@gmail.com',
      fromName: 'Acme',
    };
    await controller.putSetting(req, dto);
    expect(service.upsertSmtpSetting).toHaveBeenCalledWith('tenant-123', dto, 'user-789');
  });

  it('should verify connection', async () => {
    const req = { user: { tenantId: 'tenant-123' } };
    const dto = { testRecipientEmail: 'test@domain.com' };
    await controller.verifyConnection(req, dto);
    expect(service.verifySmtpConnection).toHaveBeenCalledWith('tenant-123', 'test@domain.com');
  });

  it('should delete setting', async () => {
    const req = { user: { tenantId: 'tenant-123' } };
    await controller.deleteSetting(req);
    expect(service.deleteSmtpSetting).toHaveBeenCalledWith('tenant-123');
  });
});
