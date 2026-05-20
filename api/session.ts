import { prisma } from './_lib/db';
import { hashIp, getClientIp } from './_lib/ip';
import { json, withMethods } from './_lib/http';
import { ensureSessionId } from './_lib/session';

export default withMethods({
  POST: async (req, res) => {
    // #region agent log
    console.log('[DEBUG b93c72] session.ts: POST handler entered');
    // #endregion
    const sessionId = ensureSessionId(req, res);
    const ipHash = hashIp(getClientIp(req));

    let player = await prisma.player.findUnique({ where: { sessionId } });

    if (!player) {
      player = await prisma.player.create({
        data: { sessionId, ipHash },
      });
    } else if (player.ipHash !== ipHash) {
      player = await prisma.player.update({
        where: { id: player.id },
        data: { ipHash },
      });
    }

    json(res, {
      playerId: player.id,
      displayName: player.displayName,
      walletPubkey: player.walletPubkey,
    });
  },
});
