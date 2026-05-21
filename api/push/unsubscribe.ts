import { z } from 'zod';
import { getAuthenticatedPlayer } from '../_lib/auth';
import { prisma } from '../_lib/db';
import { badRequest, json, unauthorized, withMethods, parseJsonBody } from '../_lib/http';

const bodySchema = z.object({
  endpoint: z.string().url(),
});

export default withMethods({
  POST: async (req, res) => {
    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const parsed = bodySchema.safeParse(parseJsonBody(req));
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const { endpoint } = parsed.data;

    await prisma.pushSubscription.updateMany({
      where: { endpoint, playerId: player.id },
      data: { enabled: false },
    });

    json(res, { ok: true });
  },
});
