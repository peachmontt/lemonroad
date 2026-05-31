import { z } from 'zod';
import { getAuthenticatedPlayer } from '../_lib/auth';
import { prisma } from '../_lib/db';
import { badRequest, json, unauthorized, withMethods, parseJsonBody } from '../_lib/http';
import { rateLimit } from '../_lib/rate-limit';
import { getSessionId } from '../_lib/session';
import { sanitizeEquippedSelection } from '../../shared/lemonVisual';

const bodySchema = z.object({
  selectedBadge: z.string().nullable().optional(),
  selectedSkin: z.string().nullable().optional(),
});

export default withMethods({
  PATCH: async (req, res) => {
    const sessionId = getSessionId(req) ?? req.socket?.remoteAddress ?? 'anon';
    if (!rateLimit(req, res, `equip:${sessionId}`, { max: 30, windowMs: 60 * 60 * 1000 })) {
      return;
    }

    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const parsed = bodySchema.safeParse(parseJsonBody(req));
    if (!parsed.success) {
      return badRequest(res, parsed.error.message);
    }

    const incoming = parsed.data;
    const sanitized = sanitizeEquippedSelection(
      incoming.selectedBadge !== undefined ? incoming.selectedBadge : player.selectedBadge,
      incoming.selectedSkin !== undefined ? incoming.selectedSkin : player.selectedSkin,
    );

    const updated = await prisma.player.update({
      where: { id: player.id },
      data: {
        selectedBadge: sanitized.selectedBadge,
        selectedSkin: sanitized.selectedSkin,
      },
    });

    json(res, {
      playerId: updated.id,
      displayName: updated.displayName,
      walletPubkey: updated.walletPubkey,
      selectedBadge: updated.selectedBadge,
      selectedSkin: updated.selectedSkin,
    });
  },
});
