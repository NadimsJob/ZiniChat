import { ToolConfigValidatorService } from './tool-config-validator.service';
import { BadRequestException } from '@nestjs/common';

describe('ToolConfigValidatorService', () => {
  let service: ToolConfigValidatorService;

  beforeEach(() => {
    service = new ToolConfigValidatorService();
  });

  it('should validate correct product_matching config', async () => {
    const config = { minMatchConfidence: 0.75 };
    const res = await service.validateToolConfig('product_matching', config);
    expect(res).toEqual(config);
  });

  it('should reject invalid product_matching confidence score (string or out of range)', async () => {
    await expect(
      service.validateToolConfig('product_matching', { minMatchConfidence: 'invalid' })
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.validateToolConfig('product_matching', { minMatchConfidence: 1.5 })
    ).rejects.toThrow(BadRequestException);
  });

  it('should validate order_placement boolean config', async () => {
    const config = { requireExplicitConfirmation: false };
    const res = await service.validateToolConfig('order_placement', config);
    expect(res).toEqual(config);
  });
});
