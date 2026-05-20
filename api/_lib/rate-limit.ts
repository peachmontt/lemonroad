/**
 * In-memory rate limiter.
 * Works per serverless instance — good enough for abuse prevention.
 * For multi-instance protection, swap the store for Upstash Redis.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

function cleanup() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}

export interface RateLimit {
  max: number;
  windowMs: number;
}

export function checkRateLimit(
  key: string,
  { max, windowMs }: RateLimit,
): { ok: boolean; remaining: number; resetAt: number } {
  if (store.size > 10_000) cleanup();

  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, max - bucket.count);
  return { ok: bucket.count <= max, remaining, resetAt: bucket.resetAt };
}

export function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
  key: string,
  limit: RateLimit,
): boolean {
  const { ok, remaining, resetAt } = checkRateLimit(key, limit);
  res.setHeader('X-RateLimit-Limit', String(limit.max));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  if (!ok) {
    res.status(429).json({ error: 'Too many requests — slow down.' });
  }
  return ok;
}
