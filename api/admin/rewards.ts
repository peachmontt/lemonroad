import { z } from 'zod';
import { prisma } from '../_lib/db';
import { previousDayBucket, dayBucketToDate } from '../_lib/day';
import { badRequest, json, unauthorized, withMethods, parseJsonBody } from '../_lib/http';
import { isAdminAuthorized } from '../_lib/session';

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PAID', 'REJECTED']),
  txHash: z.string().optional(),
});

export default withMethods({
  GET: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const rawDate = typeof req.query.date === 'string' ? req.query.date : 'yesterday';
    const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;

    let dateStr: string;
    if (rawDate === 'yesterday') {
      dateStr = previousDayBucket();
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      dateStr = rawDate;
    } else {
      return badRequest(res, 'Invalid date (use yesterday or YYYY-MM-DD)');
    }

    const date = dayBucketToDate(dateStr);

    const rewards = await prisma.dailyReward.findMany({
      where: {
        date,
        ...(rawStatus ? { status: rawStatus as 'PENDING' | 'PAID' | 'REJECTED' } : {}),
      },
      orderBy: { position: 'asc' },
      include: {
        player: { select: { id: true, displayName: true, walletPubkey: true } },
      },
    });

    json(res, {
      date: dateStr,
      rewards: rewards.map((r) => ({
        id: r.id,
        date: r.date.toISOString().slice(0, 10),
        position: r.position,
        rewardAmount: r.rewardAmount,
        rewardCurrency: r.rewardCurrency,
        status: r.status,
        txHash: r.txHash,
        createdAt: r.createdAt.toISOString(),
        player: {
          id: r.player.id,
          displayName: r.player.displayName,
          walletPubkey: r.player.walletPubkey,
        },
      })),
    });
  },

  PATCH: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const parsed = patchSchema.safeParse(parseJsonBody(req));
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const { id, status, txHash } = parsed.data;

    const existing = await prisma.dailyReward.findUnique({ where: { id } });
    if (!existing) return badRequest(res, 'Reward not found');
    if (existing.status !== 'PENDING') {
      res.status(409).json({ error: `Reward is already ${existing.status} — cannot change` });
      return;
    }

    const updated = await prisma.dailyReward.update({
      where: { id },
      data: {
        status,
        ...(status === 'PAID' && txHash ? { txHash } : {}),
      },
      include: {
        player: { select: { id: true, displayName: true, walletPubkey: true } },
      },
    });

    json(res, {
      id: updated.id,
      status: updated.status,
      txHash: updated.txHash,
      player: {
        id: updated.player.id,
        displayName: updated.player.displayName,
        walletPubkey: updated.player.walletPubkey,
      },
    });
  },
});
