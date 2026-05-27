import { getAuthenticatedPlayer } from './_lib/auth';
import { json, serviceUnavailable, unauthorized, withMethods } from './_lib/http';
import { rateLimit } from './_lib/rate-limit';
import { getReferralStats } from './_lib/referrals';
import { getSessionId } from './_lib/session';
import { isPrismaConnectionError, prismaOp } from './_lib/prisma-ops';

export default withMethods({
  GET: async (req, res) => {
    const sessionId = getSessionId(req) ?? req.socket?.remoteAddress ?? 'anon';
    if (!rateLimit(req, res, `referrals:get:${sessionId}`, { max: 60, windowMs: 60 * 60 * 1000 })) {
      return;
    }

    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    try {
      const stats = await prismaOp('referrals.getStats', { playerId: player.id }, () =>
        getReferralStats(player.id),
      );
      json(res, stats);
    } catch (err) {
      if (isPrismaConnectionError(err)) {
        return serviceUnavailable(res, 'Could not load referrals, please try again');
      }
      throw err;
    }
  },
});
