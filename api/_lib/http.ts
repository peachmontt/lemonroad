import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiHandler } from './types';

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ error: 'Method not allowed' });
}

export function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ error: message });
}

export function unauthorized(res: VercelResponse, message = 'Unauthorized') {
  return res.status(401).json({ error: message });
}

export function json(res: VercelResponse, data: unknown, status = 200) {
  return res.status(status).json(data);
}

export function withMethods(
  handlers: Partial<Record<string, ApiHandler>>,
): ApiHandler {
  return async (req, res) => {
    const handler = handlers[req.method ?? ''];
    if (!handler) {
      methodNotAllowed(res, Object.keys(handlers));
      return;
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      // #region agent log
      console.error('[DEBUG b93c72] http.ts: withMethods caught error:', err);
      // #endregion
      if (!res.writableEnded) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Internal server error',
        });
      }
    }
  };
}

export function parseJsonBody<T>(req: VercelRequest): T {
  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as T;
  }
  return req.body as T;
}
