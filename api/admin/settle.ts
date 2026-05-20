import { prisma } from '../_lib/db';
import { json, unauthorized, withMethods, badRequest, parseJsonBody } from '../_lib/http';
import { isAdminAuthorized } from '../_lib/session';
import { hourBucketToDate } from '../_lib/hour';
import { computeDistribution, formatUsdt } from '../_lib/pool-math';
import { buildSettleHourTransaction } from '../_lib/solana';

export default withMethods({
  POST: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const body = parseJsonBody<{ hourBucket?: string }>(req);
    if (!body.hourBucket || !/^\d+$/.test(body.hourBucket)) {
      return badRequest(res, 'hourBucket (unix hour integer) required');
    }

    const hourBucket = body.hourBucket;
    const hourStart = hourBucketToDate(hourBucket);

    const existing = await prisma.hourlyPool.findUnique({ where: { hourStart } });
    if (existing?.settledAt) {
      return json(res, { message: 'Already settled', hour: hourBucket });
    }

    const runs = await prisma.gameRun.findMany({
      where: { mode: 'paid', hourBucket },
      orderBy: [{ distance: 'desc' }, { diedAt: 'asc' }],
    });

    const bestByWallet = new Map<string, { distance: number; diedAt: Date }>();
    for (const run of runs) {
      const w = run.walletPubkey;
      if (!w) continue;
      const ex = bestByWallet.get(w);
      if (!ex || run.distance > ex.distance) bestByWallet.set(w, { distance: run.distance, diedAt: run.diedAt });
    }
    const sorted = [...bestByWallet.entries()].sort((a, b) => b[1].distance - a[1].distance);
    const participants = sorted.length;
    const winners: [string | null, string | null, string | null] = [
      sorted[0]?.[0] ?? null,
      sorted[1]?.[0] ?? null,
      sorted[2]?.[0] ?? null,
    ];

    const deposited = existing?.depositedUsdt ?? 0n;
    const rolloverIn = existing?.rolloverIn ?? 0n;
    const poolTotal = deposited + rolloverIn;

    const distribution = computeDistribution(poolTotal, participants, winners);

    const amounts: [bigint, bigint, bigint] = [0n, 0n, 0n];
    for (const p of distribution.payouts) amounts[p.place - 1] = p.amount;

    let settleTx: string | null = null;
    if (poolTotal > 0n && distribution.payouts.length > 0) {
      settleTx = await buildSettleHourTransaction(BigInt(hourBucket), participants, winners, amounts);
    }

    await prisma.hourlyPool.upsert({
      where: { hourStart },
      create: {
        hourStart,
        participantCount: participants,
        depositedUsdt: deposited,
        rolloverIn,
        rolloverOut: distribution.rolloverOut,
        settledAt: new Date(),
        settleTx,
      },
      update: {
        participantCount: participants,
        rolloverIn,
        rolloverOut: distribution.rolloverOut,
        settledAt: new Date(),
        settleTx,
      },
    });

    for (const p of distribution.payouts) {
      await prisma.prizePayout.upsert({
        where: { hourStart_place: { hourStart, place: p.place } },
        create: { hourStart, place: p.place, walletPubkey: p.walletPubkey, amountUsdt: p.amount, txSignature: settleTx },
        update: { amountUsdt: p.amount, txSignature: settleTx },
      });
    }

    const nextHourStart = new Date((Number(hourBucket) + 1) * 3_600_000);
    if (distribution.rolloverOut > 0n) {
      await prisma.hourlyPool.upsert({
        where: { hourStart: nextHourStart },
        create: { hourStart: nextHourStart, rolloverIn: distribution.rolloverOut },
        update: { rolloverIn: { increment: distribution.rolloverOut } },
      });
    }

    json(res, {
      hour: hourBucket,
      participants,
      poolTotal: poolTotal.toString(),
      payouts: distribution.payouts.map((p) => ({
        place: p.place,
        wallet: p.walletPubkey,
        amount: p.amount.toString(),
        amountFormatted: formatUsdt(p.amount),
      })),
      rolloverOut: distribution.rolloverOut.toString(),
      settleTx,
    });
  },
});
