// Basic in-memory rate limiter for Vercel Serverless
// Note: This only works per-instance. In a true production environment,
// use Upstash Redis for global distributed rate limiting.

const rateLimitMap = new Map();

export function checkRateLimit(ipOrToken, limit = 5, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  let record = rateLimitMap.get(ipOrToken);
  
  if (!record) {
    record = { count: 1, firstRequest: now };
    rateLimitMap.set(ipOrToken, record);
    return true; // Allowed
  }
  
  // If outside the window, reset
  if (record.firstRequest < windowStart) {
    record.count = 1;
    record.firstRequest = now;
    rateLimitMap.set(ipOrToken, record);
    return true; // Allowed
  }
  
  // Inside window
  if (record.count >= limit) {
    return false; // Rate limited
  }
  
  record.count += 1;
  rateLimitMap.set(ipOrToken, record);
  return true; // Allowed
}