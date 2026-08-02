/**
 * XSS Sanitization utility to strip executable scripts and malicious HTML/JS payloads
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe, object, embed tags
    .replace(/<(iframe|object|embed|applet)[^>]*>.*?<\/\1>/gi, '')
    // Remove inline event handlers (onload, onerror, onclick, etc.)
    .replace(/\s*on\w+\s*=\s*(['"])(.*?)\1/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: pseudo-protocols
    .replace(/javascript\s*:/gi, 'no-javascript:')
    // Remove data: text/html pseudo-protocols
    .replace(/data\s*:\s*text\/html/gi, 'data:text/plain');
}

/**
 * Recursively sanitizes strings, objects, and arrays against XSS injections
 */
export function sanitizeInput<T = any>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const sanitizedObj: any = {};
    for (const key of Object.keys(input)) {
      const cleanKey = sanitizeString(key);
      sanitizedObj[cleanKey] = sanitizeInput((input as any)[key]);
    }
    return sanitizedObj as T;
  }

  return input;
}
