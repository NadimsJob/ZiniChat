import { Test, TestingModule } from '@nestjs/testing';
import { WebsiteCrawlerService } from './website-crawler.service';

describe('WebsiteCrawlerService', () => {
  let service: WebsiteCrawlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebsiteCrawlerService],
    }).compile();

    service = module.get<WebsiteCrawlerService>(WebsiteCrawlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should clean HTML tags and scripts properly', () => {
    const rawHtml = `
      <html>
        <head><style>body { color: red; }</style></head>
        <body>
          <script>console.log("junk");</script>
          <h1>Welcome to Test Business</h1>
          <p>We provide quality products &amp; services.</p>
        </body>
      </html>
    `;
    const cleanText = service.cleanHtmlToText(rawHtml);
    expect(cleanText).toContain('Welcome to Test Business');
    expect(cleanText).toContain('We provide quality products & services.');
    expect(cleanText).not.toContain('console.log');
    expect(cleanText).not.toContain('color: red');
  });

  it('should extract internal links matching the same domain', () => {
    const html = `
      <a href="/about">About Us</a>
      <a href="https://example.com/services">Services</a>
      <a href="https://facebook.com/example">Facebook</a>
    `;
    const links = service.extractInternalLinks(html, 'https://example.com');
    expect(links).toContain('https://example.com/about');
    expect(links).toContain('https://example.com/services');
    expect(links).not.toContain('https://facebook.com/example');
  });
});
