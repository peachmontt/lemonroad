import { getAuthenticatedPlayer } from '../_lib/auth';
import { listClaimablePayouts } from '../_lib/claim-payout';
import { json, unauthorized, withMethods } from '../_lib/http';
import { isPrismaConnectionError, prismaOp } from '../_lib/prisma-ops';

export default withMethods({
  GET: async (req, res) => {
    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    try {
      const payouts = await prismaOp('prizePayout.claimable', { playerId: player.id }, () =>
        listClaimablePayouts(player.id, player.walletPubkey),
      );
      json(res, { payouts });
    } catch (err) {
      console.error('[claimable] GET failed', err);
      if (isPrismaConnectionError(err)) {
        return json(res, { payouts: [], error: 'Database unavailable' });
      }
      throw err;
    }
  },
});
