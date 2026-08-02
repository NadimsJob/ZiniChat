import { sanitizeString, sanitizeInput } from './sanitizer.util';

describe('SanitizerUtil', () => {
  it('should strip script tags from string', () => {
    const malicious = 'Hello <script>alert("xss")</script> World';
    expect(sanitizeString(malicious)).toBe('Hello  World');
  });

  it('should remove inline event handlers', () => {
    const malicious = '<img src="x" onerror="alert(1)" />';
    expect(sanitizeString(malicious)).toBe('<img src="x" />');
  });

  it('should sanitize javascript protocol URLs', () => {
    const malicious = '<a href="javascript:alert(1)">Click</a>';
    expect(sanitizeString(malicious)).toBe('<a href="no-javascript:alert(1)">Click</a>');
  });

  it('should recursively sanitize object properties and arrays', () => {
    const payload = {
      name: 'John <script>bad()</script>',
      tags: ['<script>evil()</script>', 'clean'],
      nested: {
        bio: 'Hello <iframe src="bad.com"></iframe>'
      }
    };

    const clean = sanitizeInput(payload);
    expect(clean.name).toBe('John ');
    expect(clean.tags[0]).toBe('');
    expect(clean.tags[1]).toBe('clean');
    expect(clean.nested.bio).toBe('Hello ');
  });
});
