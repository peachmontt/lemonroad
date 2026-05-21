import { z } from 'zod';
import { getAuthenticatedPlayer } from '../_lib/auth';
import { prisma } from '../_lib/db';
import { badRequest, json, unauthorized, withMethods, parseJsonBody } from '../_lib/http';

const bodySchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export default withMethods({
  POST: async (req, res) => {
    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const parsed = bodySchema.safeParse(parseJsonBody(req));
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const { endpoint, p256dh, auth } = parsed.data;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { playerId: player.id, endpoint, p256dh, auth, enabled: true },
      update: { playerId: player.id, p256dh, auth, enabled: true },
    });

    json(res, { ok: true });
  },
});
