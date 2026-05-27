import { z } from 'zod';
import { getAuthenticatedPlayer } from '../_lib/auth';
import { hashIp, getClientIp } from '../_lib/ip';
import { badRequest, json, serviceUnavailable, unauthorized, withMethods, parseJsonBody } from '../_lib/http';
import { rateLimit } from '../_lib/rate-limit';
import { attributeReferral } from '../_lib/referrals';
import { getSessionId } from '../_lib/session';
import { isPrismaConnectionError, prismaOp } from '../_lib/prisma-ops';

const bodySchema = z.object({
  code: z.string().min(1).max(32),
});

export default withMethods({
  POST: async (req, res) => {
    const sessionId = getSessionId(req) ?? req.socket?.remoteAddress ?? 'anon';
    if (!rateLimit(req, res, `referrals:attr:${sessionId}`, { max: 5, windowMs: 60 * 60 * 1000 })) {
      return;
    }

    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const parsed = bodySchema.safeParse(parseJsonBody(req));
    if (!parsed.success) return badRequest(res, parsed.error.message);

    try {
      const result = await prismaOp('referrals.attribute', { playerId: player.id }, () =>
        attributeReferral(player, parsed.data.code, hashIp(getClientIp(req))),
      );
      json(res, result);
    } catch (err) {
      if (isPrismaConnectionError(err)) {
        return serviceUnavailable(res, 'Could not attribute referral, please try again');
      }
      throw err;
    }
  },
});
