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
      fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b93c72'},body:JSON.stringify({sessionId:'b93c72',location:'http.ts:catch',message:'withMethods caught error',data:{error:String(err),msg:err instanceof Error?err.message:null},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
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
