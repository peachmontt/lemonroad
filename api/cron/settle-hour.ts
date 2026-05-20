import { prisma } from '../_lib/db';
import { hourBucketToDate, previousHourBucket } from '../_lib/hour';
import { json, unauthorized, withMethods } from '../_lib/http';
import { computeDistribution } from '../_lib/pool-math';
import { buildSettleHourTransaction } from '../_lib/solana';

async function getWinnersForHour(hourBucket: string) {
  const runs = await prisma.gameRun.findMany({
    where: { mode: 'paid', hourBucket },
    orderBy: [{ distance: 'desc' }, { diedAt: 'asc' }],
  });

  const bestByWallet = new Map<string, { distance: number; diedAt: Date }>();
  for (const run of runs) {
    const w = run.walletPubkey;
    if (!w) continue;
    const ex = bestByWallet.get(w);
    if (!ex || run.distance > ex.distance) {
      bestByWallet.set(w, { distance: run.distance, diedAt: run.diedAt });
    }
  }

  const sorted = [...bestByWallet.entries()].sort(
    (a, b) => b[1].distance - a[1].distance,
  );

  return {
    participants: sorted.length,
    winners: [
      sorted[0]?.[0] ?? null,
      sorted[1]?.[0] ?? null,
      sorted[2]?.[0] ?? null,
    ] as [string | null, string | null, string | null],
  };
}

export default withMethods({
  GET: async (req, res) => {
    const secret = req.headers.authorization?.replace('Bearer ', '');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return unauthorized(res, 'Invalid cron secret');
    }

    const hourBucket = previousHourBucket();
    const hourStart = hourBucketToDate(hourBucket);

    const existing = await prisma.hourlyPool.findUnique({
      where: { hourStart },
    });

    if (existing?.settledAt) {
      return json(res, { message: 'Already settled', hour: hourBucket });
    }

    const { participants, winners } = await getWinnersForHour(hourBucket);

    const prevRollover = await prisma.hourlyPool.findFirst({
      where: { settledAt: { not: null } },
      orderBy: { hourStart: 'desc' },
    });

    const rolloverIn =
      existing?.rolloverIn ??
      (hourStart > (prevRollover?.hourStart ?? new Date(0))
        ? prevRollover?.rolloverOut ?? 0n
        : 0n);

    const deposited = existing?.depositedUsdt ?? 0n;
    const poolTotal = deposited + rolloverIn;

    const distribution = computeDistribution(
      poolTotal,
      participants,
      winners,
    );

    const amounts: [bigint, bigint, bigint] = [0n, 0n, 0n];
    for (const p of distribution.payouts) {
      amounts[p.place - 1] = p.amount;
    }

    let settleTx: string | null = null;
    if (poolTotal > 0n && distribution.payouts.length > 0) {
      settleTx = await buildSettleHourTransaction(
        BigInt(hourBucket),
        participants,
        winners,
        amounts,
      );
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
        where: {
          hourStart_place: { hourStart, place: p.place },
        },
        create: {
          hourStart,
          place: p.place,
          walletPubkey: p.walletPubkey,
          amountUsdt: p.amount,
          txSignature: settleTx,
        },
        update: {
          amountUsdt: p.amount,
          txSignature: settleTx,
        },
      });
    }

    const nextHourStart = new Date((Number(hourBucket) + 1) * 3_600_000);
    if (distribution.rolloverOut > 0n) {
      await prisma.hourlyPool.upsert({
        where: { hourStart: nextHourStart },
        create: {
          hourStart: nextHourStart,
          rolloverIn: distribution.rolloverOut,
        },
        update: {
          rolloverIn: { increment: distribution.rolloverOut },
        },
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
      })),
      rolloverOut: distribution.rolloverOut.toString(),
      settleTx,
    });
  },
});
