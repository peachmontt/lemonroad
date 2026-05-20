import { prisma } from './_lib/db';
import { hashIp, getClientIp } from './_lib/ip';
import { json, withMethods } from './_lib/http';
import { ensureSessionId } from './_lib/session';

export default withMethods({
  POST: async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b93c72'},body:JSON.stringify({sessionId:'b93c72',location:'session.ts:handler-enter',message:'POST /api/session handler invoked',hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
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
