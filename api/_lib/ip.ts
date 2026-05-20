import { createHash } from 'crypto';
import type { VercelRequest } from '@vercel/node';

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() || 'unknown';
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') return realIp;
  return req.socket?.remoteAddress ?? 'unknown';
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'lemonroad-dev-salt';
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}
