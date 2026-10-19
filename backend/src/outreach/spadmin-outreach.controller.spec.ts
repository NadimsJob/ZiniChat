import { Test, TestingModule } from '@nestjs/testing';
import { SpadminOutreachController } from './spadmin-outreach.controller';
import { SpadminOutreachService } from './spadmin-outreach.service';

describe('SpadminOutreachController', () => {
  let controller: SpadminOutreachController;
  let service: jest.Mocked<Partial<SpadminOutreachService>>;

  beforeEach(async () => {
    service = {
      getConfig: jest.fn().mockResolvedValue({
        id: 'cfg-1',
        serpApiProvider: 'serper',
        hasSerpApiKey: true,
      }),
      updateConfig: jest.fn().mockResolvedValue({
        id: 'cfg-1',
        serpApiProvider: 'serper',
      }),
      toggleEmergencyKillSwitch: jest.fn().mockResolvedValue({
        isEmergencyPaused: true,
        emergencyPausedReason: 'Investigating abuse',
      }),
      getSuppressions: jest.fn().mockResolvedValue({
        items: [{ id: 'sup-1', email: 'blocked@test.com' }],
        total: 1,
        page: 1,
        limit: 50,
      }),
      addSuppression: jest.fn().mockResolvedValue({
        id: 'sup-2',
        email: 'bad@actor.com',
      }),
      deleteSuppression: jest.fn().mockResolvedValue({
        success: true,
      }),
      testSerpConnection: jest.fn().mockResolvedValue({
        success: true,
        message: 'Connected',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpadminOutreachController],
      providers: [
        {
          provide: SpadminOutreachService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<SpadminOutreachController>(SpadminOutreachController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get global config', async () => {
    const res = await controller.getConfig();
    expect(res).toEqual({ id: 'cfg-1', serpApiProvider: 'serper', hasSerpApiKey: true });
    expect(service.getConfig).toHaveBeenCalled();
  });

  it('should update config and extract userId from request', async () => {
    const dto = { serpApiProvider: 'serper', visionCreditCost: 2 };
    const req = { user: { id: 'admin-123' } };
    await controller.updateConfig(dto, req);
    expect(service.updateConfig).toHaveBeenCalledWith(dto, 'admin-123');
  });

  it('should toggle kill switch', async () => {
    const req = { user: { userId: 'admin-456' } };
    await controller.toggleKillSwitch({ isPaused: true, reason: 'Investigating abuse' }, req);
    expect(service.toggleEmergencyKillSwitch).toHaveBeenCalledWith(true, 'Investigating abuse', 'admin-456');
  });

  it('should get suppressions with pagination defaults', async () => {
    await controller.getSuppressions();
    expect(service.getSuppressions).toHaveBeenCalledWith(1, 50);
  });

  it('should add suppression', async () => {
    const dto = { email: 'bad@actor.com', reason: 'spam' };
    const req = { user: { id: 'admin-1' } };
    await controller.addSuppression(dto, req);
    expect(service.addSuppression).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('should delete suppression', async () => {
    const req = { user: { id: 'admin-1' } };
    await controller.deleteSuppression('sup-1', req);
    expect(service.deleteSuppression).toHaveBeenCalledWith('sup-1', 'admin-1');
  });

  it('should test SERP connection', async () => {
    await controller.testSerpConnection();
    expect(service.testSerpConnection).toHaveBeenCalled();
  });
});
