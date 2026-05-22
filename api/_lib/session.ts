import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const COOKIE_NAME = 'lr_session';
const MAX_AGE = 60 * 60 * 24 * 365;

export function getSessionId(req: VercelRequest): string | null {
  const cookie = req.headers.cookie ?? '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

export function setSessionCookie(res: VercelResponse, sessionId: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`,
  );
}

export function ensureSessionId(
  req: VercelRequest,
  res: VercelResponse,
): string {
  const existing = getSessionId(req);
  if (existing) return existing;
  const id = randomUUID();
  setSessionCookie(res, id);
  return id;
}

/** Admin cookie helpers */
const ADMIN_COOKIE = 'lr_admin';

export function getAdminToken(req: VercelRequest): string | null {
  const cookie = req.headers.cookie ?? '';
  const match = cookie.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export function setAdminCookie(res: VercelResponse, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=3600${secure}`,
  );
}

export function isAdminAuthorized(req: VercelRequest): boolean {
  const secret = (process.env.ADMIN_SECRET ?? '').trim();
  if (!secret) return false;
  const header = (req.headers.authorization ?? '').replace('Bearer ', '').trim();
  if (header === secret) return true;
  const cookie = (getAdminToken(req) ?? '').trim();
  return cookie === secret;
}
