/**
 * police-security.ts — Security helpers for Next.js App Router police API routes.
 * Adapted from voice-transcript-police/lib/security.js.
 */

// In-memory rate limit store (per serverless instance).
// Sufficient for small-force deployments. For scale, swap with Upstash Redis.
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Access-Control-Allow-Origin':
      process.env.ALLOWED_ORIGIN || 'https://voice-recording-transcription.vercel.app',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };
}

/** Returns false (and adds Remaining header) when limit exceeded. */
export function checkRateLimit(
  req: Request,
  max: number,
  windowMs: number
): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const key = `${ip}:${new URL(req.url).pathname}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  rateLimitStore.set(key, entry);
  return entry.count <= max;
}

export function sanitise(val: unknown, maxLen = 255): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
