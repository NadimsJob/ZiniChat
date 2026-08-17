import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebsiteCrawlerService {
  private readonly logger = new Logger(WebsiteCrawlerService.name);

  /**
   * Extracts clean text from an HTML string by removing scripts, styles, navs, footers, etc.
   */
  cleanHtmlToText(html: string): string {
    if (!html) return '';
    let text = html
      // Remove scripts, styles, SVG, noscript
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
      // Replace breaks & block ends with newlines
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|br)>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode basic HTML entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      // Collapse multiple whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();

    return text;
  }

  /**
   * Extract internal URLs belonging to the same host domain
   */
  extractInternalLinks(html: string, baseUrl: string): string[] {
    const links = new Set<string>();
    try {
      const parsedBase = new URL(baseUrl);
      const host = parsedBase.host;

      const hrefRegex = /href=["']([^"']+)["']/gi;
      let match: RegExpExecArray | null;

      while ((match = hrefRegex.exec(html)) !== null) {
        let href = match[1].trim();

        // Ignore hash, javascript, mailto, tel, media
        if (
          !href ||
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          /\.(jpg|jpeg|png|gif|svg|pdf|zip|css|js)$/i.test(href)
        ) {
          continue;
        }

        let absoluteUrl: string;
        try {
          absoluteUrl = new URL(href, baseUrl).toString();
        } catch {
          continue;
        }

        const parsedUrl = new URL(absoluteUrl);
        // Ensure same domain
        if (parsedUrl.host === host && (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')) {
          // Remove hash & trailing slash for normalization
          parsedUrl.hash = '';
          let normalized = parsedUrl.toString();
          if (normalized.endsWith('/') && normalized.length > 8) {
            normalized = normalized.slice(0, -1);
          }
          links.add(normalized);
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to extract links from ${baseUrl}: ${e.message}`);
    }
    return Array.from(links);
  }

  /**
   * Crawl root URL and recursively up to maxPages internal links
   */
  async crawlWebsite(startUrl: string, maxPages: number = 10): Promise<{ combinedText: string; pageCount: number }> {
    let normalizedStartUrl = startUrl.trim();
    if (!normalizedStartUrl.startsWith('http://') && !normalizedStartUrl.startsWith('https://')) {
      normalizedStartUrl = 'https://' + normalizedStartUrl;
    }

    const visited = new Set<string>();
    const queue: string[] = [normalizedStartUrl];
    let combinedText = '';

    const priorityKeywords = ['about', 'service', 'product', 'faq', 'contact', 'pricing', 'feature', 'policy', 'terms', 'help'];

    while (queue.length > 0 && visited.size < maxPages) {
      // Sort queue so priority keywords get crawled first
      queue.sort((a, b) => {
        const aScore = priorityKeywords.some(k => a.toLowerCase().includes(k)) ? 1 : 0;
        const bScore = priorityKeywords.some(k => b.toLowerCase().includes(k)) ? 1 : 0;
        return bScore - aScore;
      });

      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        this.logger.log(`Fetching URL: ${currentUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per page

        const response = await fetch(currentUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ZiniChatBot/1.0',
            'Accept': 'text/html,application/xhtml+xml'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          this.logger.warn(`Failed to fetch ${currentUrl}: HTTP ${response.status}`);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          continue;
        }

        const html = await response.text();
        const pageText = this.cleanHtmlToText(html);

        if (pageText.length > 50) {
          combinedText += `\n--- PAGE: ${currentUrl} ---\n${pageText}\n`;
        }

        // Find more internal links
        const links = this.extractInternalLinks(html, currentUrl);
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      } catch (err) {
        this.logger.warn(`Error fetching page ${currentUrl}: ${err.message}`);
      }
    }

    // Limit combined raw text to max 25,000 characters before sending to AI to conserve input tokens
    if (combinedText.length > 25000) {
      combinedText = combinedText.substring(0, 25000) + '\n[Truncated...]';
    }

    return {
      combinedText: combinedText.trim(),
      pageCount: visited.size
    };
  }
}
