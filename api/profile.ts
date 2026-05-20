import { z } from 'zod';
import { getAuthenticatedPlayer } from './_lib/auth';
import { prisma } from './_lib/db';
import { badRequest, json, unauthorized, withMethods, parseJsonBody } from './_lib/http';

const bodySchema = z.object({
  displayName: z.string().min(1).max(32).trim(),
  walletPubkey: z.string().optional(),
});

export default withMethods({
  PATCH: async (req, res) => {
    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const parsed = bodySchema.safeParse(parseJsonBody(req));
    if (!parsed.success) {
      return badRequest(res, parsed.error.message);
    }

    const { displayName, walletPubkey } = parsed.data;

    if (walletPubkey) {
      const existing = await prisma.player.findUnique({
        where: { walletPubkey },
      });
      if (existing && existing.id !== player.id) {
        return badRequest(res, 'Wallet already linked to another player');
      }
    }

    const updated = await prisma.player.update({
      where: { id: player.id },
      data: {
        displayName,
        ...(walletPubkey ? { walletPubkey } : {}),
      },
    });

    json(res, {
      playerId: updated.id,
      displayName: updated.displayName,
      walletPubkey: updated.walletPubkey,
    });
  },
});
