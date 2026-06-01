import { z } from 'zod';
import { prisma } from '../_lib/db';
import { currentDayBucket } from '../_lib/day';
import { formatUsdt } from '../_lib/pool-math';
import {
  badRequest,
  json,
  unauthorized,
  withMethods,
  parseJsonBody,
} from '../_lib/http';
import { isAdminAuthorized } from '../_lib/session';

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['EXPIRED']),
});

export default withMethods({
  GET: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const limit = Math.min(100, Number(req.query.limit) || 50);
    const rows = await prisma.prizePayout.findMany({
      orderBy: [{ hourStart: 'desc' }, { place: 'asc' }],
      take: limit,
    });

    json(res, {
      payouts: rows.map((p) => ({
        id: p.id,
        day: currentDayBucket(p.hourStart),
        hourStart: p.hourStart.toISOString(),
        place: p.place,
        walletPubkey: p.walletPubkey,
        amountUsdt: p.amountUsdt.toString(),
        amountFormatted: formatUsdt(p.amountUsdt),
        status: p.status,
        paymentChain: p.paymentChain,
        playerId: p.playerId,
        claimTx: p.claimTx ?? p.txSignature,
        claimedAt: p.claimedAt?.toISOString() ?? null,
      })),
    });
  },

  PATCH: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const parsed = patchSchema.safeParse(parseJsonBody(req));
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const existing = await prisma.prizePayout.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return badRequest(res, 'Payout not found');
    if (existing.status === 'PAID') {
      return badRequest(res, 'Cannot expire a paid payout');
    }

    const updated = await prisma.prizePayout.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });

    json(res, {
      id: updated.id,
      status: updated.status,
    });
  },
});
