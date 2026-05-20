import { prisma } from '../_lib/db';
import { json, unauthorized, withMethods } from '../_lib/http';
import { isAdminAuthorized } from '../_lib/session';
import { currentHourBucket } from '../_lib/hour';
import { formatUsdt } from '../_lib/pool-math';

export default withMethods({
  GET: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const currentHour = currentHourBucket();
    const now = new Date();

    const [
      unsettledPools,
      currentPool,
      recentPaidRuns,
      totalPlayers,
      totalRuns,
    ] = await Promise.all([
      prisma.hourlyPool.findMany({
        where: { settledAt: null, participantCount: { gt: 0 } },
        orderBy: { hourStart: 'desc' },
        take: 10,
      }),
      prisma.hourlyPool.findUnique({
        where: { hourStart: new Date(Number(currentHour) * 3_600_000) },
      }),
      prisma.gameRun.findMany({
        where: { mode: 'paid' },
        orderBy: { diedAt: 'desc' },
        take: 20,
        include: { player: { select: { displayName: true } } },
      }),
      prisma.player.count(),
      prisma.gameRun.count(),
    ]);

    const poolTotal = (currentPool?.depositedUsdt ?? 0n) + (currentPool?.rolloverIn ?? 0n);

    json(res, {
      currentHour,
      currentPool: {
        participants: currentPool?.participantCount ?? 0,
        deposited: (currentPool?.depositedUsdt ?? 0n).toString(),
        rolloverIn: (currentPool?.rolloverIn ?? 0n).toString(),
        total: poolTotal.toString(),
        totalFormatted: formatUsdt(poolTotal),
      },
      unsettledPools: unsettledPools.map((p) => ({
        hourStart: p.hourStart.toISOString(),
        participants: p.participantCount,
        deposited: p.depositedUsdt.toString(),
        rolloverIn: p.rolloverIn.toString(),
      })),
      recentPaidRuns: recentPaidRuns.map((r) => ({
        id: r.id,
        playerName: r.player.displayName,
        walletPubkey: r.walletPubkey,
        distance: r.distance,
        juiceLevel: r.juiceLevel,
        diedAt: r.diedAt.toISOString(),
        hourBucket: r.hourBucket,
      })),
      totals: { players: totalPlayers, runs: totalRuns },
      serverTime: now.toISOString(),
    });
  },
});
