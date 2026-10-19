import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { promises as dnsPromises } from 'dns';

export interface LeadCandidateInput {
  title: string;
  snippet: string;
  link: string;
  sourceChannel: string;
}

export interface EnrichedLeadResult {
  isValid: boolean;
  businessName: string;
  sourceChannel: string;
  sourcePageUrl: string;
  sourceWebsiteUrl: string | null;
  email: string | null;
  phone: string | null;
  phoneOnly: boolean;
  notes: string;
}

@Injectable()
export class WaterfallEnricherService {
  private readonly logger = new Logger(WaterfallEnricherService.name);

  // Blacklisted junk domains that never represent real business decision makers
  private readonly junkDomains = new Set([
    'facebook.com',
    'fb.com',
    'instagram.com',
    'meta.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'sentry.io',
    'wixpress.com',
    'example.com',
    'domain.com',
    'yourdomain.com',
    'test.com',
    'email.com',
    'mail.com',
    'mysite.com',
  ]);

  // File extensions that occasionally get erroneously matched by loose regex
  private readonly invalidExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.pdf', '.css', '.js'];

  /**
   * Extracts and normalizes email addresses from text.
   */
  extractEmails(text: string): string[] {
    if (!text) return [];

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    const matches = text.match(emailRegex) || [];

    const cleanedEmails = new Set<string>();

    for (const raw of matches) {
      const email = raw.toLowerCase().trim();

      // Check length constraints
      if (email.length < 6 || email.length > 100) continue;

      // Filter out invalid trailing extensions
      const hasBadExtension = this.invalidExtensions.some((ext) => email.endsWith(ext));
      if (hasBadExtension) continue;

      // Extract domain
      const parts = email.split('@');
      if (parts.length !== 2) continue;
      const domain = parts[1];

      if (this.junkDomains.has(domain)) continue;
      if (!domain.includes('.')) continue;

      cleanedEmails.add(email);
    }

    return Array.from(cleanedEmails);
  }

  /**
   * Extracts and normalizes phone / WhatsApp numbers from text.
   */
  extractPhones(text: string): string[] {
    if (!text) return [];

    const phones = new Set<string>();

    // 1. Bangladesh standard phone regex (e.g. +88017..., 88017..., 017...)
    const bdRegex = /(?:\+?880|0)(1[3-9]\d{8})\b/g;
    let match: RegExpExecArray | null;
    while ((match = bdRegex.exec(text)) !== null) {
      const nationalNum = '0' + match[1];
      phones.add(nationalNum);
    }

    // 2. Generic international numbers with country codes (e.g. +1-800-..., +44...)
    const intlRegex = /\+(?:[0-9] ?){6,14}[0-9]/g;
    const intlMatches = text.match(intlRegex) || [];
    for (const raw of intlMatches) {
      const cleaned = raw.replace(/[\s-]/g, '');
      if (cleaned.length >= 10 && cleaned.length <= 16) {
        phones.add(cleaned);
      }
    }

    return Array.from(phones);
  }

  /**
   * Validates if a domain has valid DNS MX records (checks if recipient can actually receive email).
   */
  async validateMxRecord(email: string): Promise<boolean> {
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1].toLowerCase().trim();

    try {
      // 3-second timeout protection for DNS resolution
      const mxLookupPromise = dnsPromises.resolveMx(domain);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS_TIMEOUT')), 3000),
      );

      const records = await Promise.race([mxLookupPromise, timeoutPromise]);
      return Array.isArray(records) && records.length > 0;
    } catch (err: any) {
      if (err.message === 'DNS_TIMEOUT') {
        this.logger.warn(`MX DNS resolution timed out for domain ${domain}; defaulting to permissive true`);
        return true; // Don't drop on temporary DNS timeout
      }
      return false;
    }
  }

  /**
   * Lightweight deep scraper for external business websites when no email was present in social snippets.
   */
  async deepScrapeWebsite(url: string): Promise<{ emails: string[]; phones: string[] }> {
    if (!url || !url.startsWith('http')) {
      return { emails: [], phones: [] };
    }

    // Never deep scrape social media domains
    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.includes('facebook.com') ||
      lowerUrl.includes('instagram.com') ||
      lowerUrl.includes('linkedin.com') ||
      lowerUrl.includes('twitter.com') ||
      lowerUrl.includes('youtube.com')
    ) {
      return { emails: [], phones: [] };
    }

    try {
      const res = await axios.get(url, {
        timeout: 5000,
        maxContentLength: 1024 * 1024, // 1MB limit
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ZiniMail/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      const html = typeof res.data === 'string' ? res.data : '';
      const emails = this.extractEmails(html);
      const phones = this.extractPhones(html);

      return { emails, phones };
    } catch (err: any) {
      return { emails: [], phones: [] };
    }
  }

  /**
   * Enriches a single SERP prospect candidate through the multi-stage waterfall pipeline.
   */
  async enrichLeadCandidate(candidate: LeadCandidateInput): Promise<EnrichedLeadResult> {
    const rawContent = `${candidate.title} ${candidate.snippet}`;
    let extractedEmails = this.extractEmails(rawContent);
    let extractedPhones = this.extractPhones(rawContent);
    let websiteUrl: string | null = null;

    // Detect external website link mentioned in text or candidate URL
    const urlMatches = candidate.snippet.match(/https?:\/\/[^\s"',]+/gi) || [];
    for (const foundUrl of urlMatches) {
      const cleanUrl = foundUrl.replace(/[.,;)]+$/, '');
      if (
        !cleanUrl.includes('facebook.com') &&
        !cleanUrl.includes('instagram.com') &&
        !cleanUrl.includes('linkedin.com')
      ) {
        websiteUrl = cleanUrl;
        break;
      }
    }

    // Stage 2: Deep Crawler Fallback if no email was found in the SERP snippet
    if (extractedEmails.length === 0 && websiteUrl) {
      const scraped = await this.deepScrapeWebsite(websiteUrl);
      if (scraped.emails.length > 0) {
        extractedEmails = scraped.emails;
      }
      if (scraped.phones.length > 0 && extractedPhones.length === 0) {
        extractedPhones = scraped.phones;
      }
    }

    // Clean business name from title
    let businessName = candidate.title
      .replace(/\|.*$/g, '')
      .replace(/-.*$/g, '')
      .replace(/Facebook.*$/i, '')
      .replace(/Instagram.*$/i, '')
      .replace(/LinkedIn.*$/i, '')
      .trim();

    if (!businessName || businessName.length < 2) {
      businessName = 'Business Prospect';
    }

    // Stage 3: Email Quality & MX Validation
    let validEmail: string | null = null;
    for (const email of extractedEmails) {
      const hasMx = await this.validateMxRecord(email);
      if (hasMx) {
        validEmail = email;
        break;
      }
    }

    const primaryPhone = extractedPhones.length > 0 ? extractedPhones[0] : null;

    // Stage 4: Classification
    if (validEmail) {
      return {
        isValid: true,
        businessName,
        sourceChannel: candidate.sourceChannel,
        sourcePageUrl: candidate.link,
        sourceWebsiteUrl: websiteUrl,
        email: validEmail,
        phone: primaryPhone,
        phoneOnly: false,
        notes: `Discovered via ${candidate.sourceChannel} SERP dorking. Valid MX verified.`,
      };
    }

    // Stage 5: No-Email Phone Harvester
    if (primaryPhone) {
      return {
        isValid: true,
        businessName,
        sourceChannel: candidate.sourceChannel,
        sourcePageUrl: candidate.link,
        sourceWebsiteUrl: websiteUrl,
        email: null,
        phone: primaryPhone,
        phoneOnly: true,
        notes: `Phone-only lead harvested via ${candidate.sourceChannel}. No public email found on page.`,
      };
    }

    // Discard leads with neither valid email nor phone
    return {
      isValid: false,
      businessName,
      sourceChannel: candidate.sourceChannel,
      sourcePageUrl: candidate.link,
      sourceWebsiteUrl: websiteUrl,
      email: null,
      phone: null,
      phoneOnly: false,
      notes: 'No contact details discovered',
    };
  }
}
