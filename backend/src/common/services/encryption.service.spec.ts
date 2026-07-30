import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt a plaintext string correctly', () => {
    const rawSecret = 'EAAI1234567890SecretToken';
    const encrypted = service.encrypt(rawSecret);

    expect(encrypted).not.toEqual(rawSecret);
    expect(encrypted).toContain(':');

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(rawSecret);
  });

  it('should return plaintext as-is if string is not encrypted during decrypt()', () => {
    const legacyPlaintext = 'legacy_unencrypted_token';
    const decrypted = service.decrypt(legacyPlaintext);

    expect(decrypted).toEqual(legacyPlaintext);
  });
});
