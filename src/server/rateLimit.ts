/**
 * In-memory token bucket. Good enough for a single app instance on one VPS;
 * swap for Redis if you run several instances.
 */
const buckets = new Map<string, { tokens: number; at: number }>();

export function rateLimit(key: string, perMinute: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  const refill = perMinute / 60_000;
  const b = buckets.get(key) ?? { tokens: perMinute, at: now };
  b.tokens = Math.min(perMinute, b.tokens + (now - b.at) * refill);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false, retryAfter: Math.ceil((1 - b.tokens) / refill / 1000) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 50_000) {
    for (const [k, v] of buckets) if (now - v.at > 10 * 60_000) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}
