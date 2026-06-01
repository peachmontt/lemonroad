import { z } from 'zod';
import { getAuthenticatedPlayer } from '../_lib/auth';
import { executeClaimPayout } from '../_lib/claim-payout';
import {
  badRequest,
  json,
  serviceUnavailable,
  unauthorized,
  withMethods,
  parseJsonBody,
} from '../_lib/http';
import { rateLimit } from '../_lib/rate-limit';
import { getSessionId } from '../_lib/session';
import { isPrismaConnectionError } from '../_lib/prisma-ops';

const bodySchema = z.object({
  payoutId: z.string().uuid(),
  walletPubkey: z.string().min(16).max(128),
});

export default withMethods({
  POST: async (req, res) => {
    const sessionId = getSessionId(req) ?? req.socket?.remoteAddress ?? 'anon';
    if (!rateLimit(req, res, `claim:${sessionId}`, { max: 10, windowMs: 60 * 1000 })) {
      return;
    }

    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const parsed = bodySchema.safeParse(parseJsonBody(req));
    if (!parsed.success) return badRequest(res, parsed.error.message);

    try {
      const result = await executeClaimPayout(
        player.id,
        parsed.data.payoutId,
        parsed.data.walletPubkey,
      );
      json(res, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[claim] POST failed', { playerId: player.id, err });
      if (isPrismaConnectionError(err)) {
        return serviceUnavailable(res, 'Could not process claim, please try again');
      }
      if (
        msg.includes('not configured') ||
        msg.includes('not found') ||
        msg.includes('Not authorized') ||
        msg.includes('does not match') ||
        msg.includes('not claimable')
      ) {
        return badRequest(res, msg);
      }
      return serviceUnavailable(res, msg || 'Claim failed');
    }
  },
});
