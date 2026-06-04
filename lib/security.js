// ═══════════════════════════════════════════════════════════
// lib/security.js — Shared security middleware
// Applied to every API route
// ═══════════════════════════════════════════════════════════

// In-memory rate limit store (per Vercel serverless instance)
// For production scale use Redis/Upstash — sufficient for small force deployments
const rateLimitStore = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitStore.entries()) {
    if (now - val.windowStart > 15 * 60 * 1000) rateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

export function rateLimit(req, res, { max = 20, windowMs = 15 * 60 * 1000 } = {}) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || 'unknown';
  const key = `${ip}:${req.url?.split('?')[0]}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));

  if (entry.count > max) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return false;
  }
  return true;
}

export function securityHeaders(res) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy — don't leak URL to third parties
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Only allow requests from our own origin
  res.setHeader('Access-Control-Allow-Origin',
    process.env.ALLOWED_ORIGIN || 'https://voice-transcript-pi.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Don't cache auth responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    securityHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

export function validateContentType(req, res) {
  if (req.method === 'POST' && !req.headers['content-type']?.includes('application/json')) {
    res.status(415).json({ error: 'Content-Type must be application/json' });
    return false;
  }
  return true;
}

// Sanitise string inputs — strip control chars, limit length
export function sanitise(val, maxLen = 255) {
  if (typeof val !== 'string') return '';
  return val.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

// Validate email format
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}