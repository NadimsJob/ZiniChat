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

  it('should validate order_placement with full payment policy and delivery charges', async () => {
    const config = {
      requireExplicitConfirmation: true,
      paymentPolicy: 'delivery_advance',
      deliveryChargeInsideDhaka: 70,
      deliveryChargeOutsideDhaka: 130,
      mfsAccounts: [
        { provider: 'bKash', accountNumber: '01712345678', accountType: 'Personal' },
        { provider: 'Nagad', accountNumber: '01812345678', accountType: 'Merchant' }
      ],
      paymentInstructionNote: 'Send money and share screenshot'
    };
    const res = await service.validateToolConfig('order_placement', config);
    expect(res).toEqual(config);
  });

  it('should reject invalid paymentPolicy or negative delivery charge', async () => {
    await expect(
      service.validateToolConfig('order_placement', {
        requireExplicitConfirmation: true,
        paymentPolicy: 'invalid_policy'
      })
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.validateToolConfig('order_placement', {
        requireExplicitConfirmation: true,
        deliveryChargeInsideDhaka: -10
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should return default config with cod policy when configJson is null', async () => {
    const res = await service.validateToolConfig('order_placement', null);
    expect(res.paymentPolicy).toBe('cod');
    expect(res.deliveryChargeInsideDhaka).toBe(60);
    expect(res.deliveryChargeOutsideDhaka).toBe(120);
  });
});
