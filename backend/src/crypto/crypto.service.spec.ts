import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    service = new CryptoService();
  });

  it('should encrypt and decrypt a plaintext API key correctly', () => {
    const rawApiKey = 'sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz';
    const encrypted = service.encrypt(rawApiKey);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(rawApiKey);
    expect(encrypted.split('.').length).toBe(3);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(rawApiKey);
  });

  it('should support legacy unencrypted plaintext keys for backward compatibility', () => {
    const legacyPlaintextKey = 'sk-proj-legacy-plaintext-key';
    const decrypted = service.decrypt(legacyPlaintextKey);
    expect(decrypted).toEqual(legacyPlaintextKey);
  });

  it('should return empty string for empty input', () => {
    expect(service.encrypt('')).toEqual('');
    expect(service.decrypt('')).toEqual('');
  });
});
