import { Test, TestingModule } from '@nestjs/testing';
import { WaterfallEnricherService } from './waterfall-enricher.service';
import axios from 'axios';
import { promises as dnsPromises } from 'dns';

jest.mock('axios');

describe('WaterfallEnricherService', () => {
  let service: WaterfallEnricherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WaterfallEnricherService],
    }).compile();

    service = module.get<WaterfallEnricherService>(WaterfallEnricherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractEmails', () => {
    it('should extract valid emails and discard duplicates', () => {
      const text = 'Contact us at sales@mybrand.com or info@mybrand.com, also sales@mybrand.com.';
      const emails = service.extractEmails(text);
      expect(emails).toEqual(['sales@mybrand.com', 'info@mybrand.com']);
    });

    it('should discard junk domains like facebook.com, sentry.io, wixpress.com', () => {
      const text = 'Emails: admin@facebook.com, bot@sentry.io, dummy@wixpress.com, valid@realcorp.com';
      const emails = service.extractEmails(text);
      expect(emails).toEqual(['valid@realcorp.com']);
    });

    it('should discard erroneously matched image file extensions', () => {
      const text = 'Assets: banner@2x.png, logo@brand.jpg, valid@company.com';
      const emails = service.extractEmails(text);
      expect(emails).toEqual(['valid@company.com']);
    });
  });

  describe('extractPhones', () => {
    it('should extract and format Bangladesh mobile numbers', () => {
      const text = 'Call us on 01712345678 or WhatsApp +8801899887766 for fast delivery.';
      const phones = service.extractPhones(text);
      expect(phones).toContain('01712345678');
      expect(phones).toContain('01899887766');
    });

    it('should extract generic international phone numbers', () => {
      const text = 'US Office: +1 800 555 0199.';
      const phones = service.extractPhones(text);
      expect(phones.length).toBeGreaterThan(0);
      expect(phones[0]).toContain('+18005550199');
    });
  });

  describe('validateMxRecord', () => {
    it('should return true when DNS MX records exist', async () => {
      jest.spyOn(dnsPromises, 'resolveMx').mockResolvedValueOnce([
        { exchange: 'mail.google.com', priority: 10 },
      ]);

      const isValid = await service.validateMxRecord('user@gmail.com');
      expect(isValid).toBe(true);
    });

    it('should return false when DNS lookup throws or has no MX records', async () => {
      jest.spyOn(dnsPromises, 'resolveMx').mockRejectedValueOnce(new Error('ENOTFOUND'));

      const isValid = await service.validateMxRecord('user@nonexistentdomainxyz123.com');
      expect(isValid).toBe(false);
    });
  });

  describe('deepScrapeWebsite', () => {
    it('should skip social media URLs', async () => {
      const res = await service.deepScrapeWebsite('https://facebook.com/somepage');
      expect(res.emails).toEqual([]);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should scrape external website and return extracted emails and phones', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: '<html><body>Contact: hello@artisanbd.com Phone: 01755443322</body></html>',
      });

      const res = await service.deepScrapeWebsite('https://artisanbd.com');
      expect(res.emails).toContain('hello@artisanbd.com');
      expect(res.phones).toContain('01755443322');
    });
  });

  describe('enrichLeadCandidate', () => {
    it('should classify candidate as valid email lead when email with MX is found', async () => {
      jest.spyOn(dnsPromises, 'resolveMx').mockResolvedValueOnce([
        { exchange: 'mail.google.com', priority: 10 },
      ]);

      const candidate = {
        title: 'Artisan Crafts BD | Facebook',
        snippet: 'Handmade pottery. Email: info@artisancrafts.com or call 01711223344.',
        link: 'https://facebook.com/artisancrafts',
        sourceChannel: 'facebook',
      };

      const result = await service.enrichLeadCandidate(candidate);
      expect(result.isValid).toBe(true);
      expect(result.phoneOnly).toBe(false);
      expect(result.email).toBe('info@artisancrafts.com');
      expect(result.phone).toBe('01711223344');
      expect(result.businessName).toBe('Artisan Crafts BD');
    });

    it('should classify candidate as phoneOnly when only phone is found', async () => {
      const candidate = {
        title: 'Dhaka Honey Corner | Instagram',
        snippet: 'Pure honey collected from Sundarbans. Direct orders via 01988776655.',
        link: 'https://instagram.com/dhakahoney',
        sourceChannel: 'instagram',
      };

      const result = await service.enrichLeadCandidate(candidate);
      expect(result.isValid).toBe(true);
      expect(result.phoneOnly).toBe(true);
      expect(result.email).toBeNull();
      expect(result.phone).toBe('01988776655');
    });

    it('should discard candidate if neither email nor phone is found', async () => {
      const candidate = {
        title: 'Random Discussion Group',
        snippet: 'We talk about various topics with no contact info.',
        link: 'https://facebook.com/groups/random',
        sourceChannel: 'facebook',
      };

      const result = await service.enrichLeadCandidate(candidate);
      expect(result.isValid).toBe(false);
    });
  });
});
