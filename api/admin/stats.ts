import { prisma } from '../_lib/db';
import { json, unauthorized, withMethods } from '../_lib/http';
import { isAdminAuthorized } from '../_lib/session';
import { currentDayBucket, dayBucketToDate } from '../_lib/day';
import { formatUsdt } from '../_lib/pool-math';

export default withMethods({
  GET: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const currentDay = currentDayBucket();
    const todayStart = dayBucketToDate(currentDay);
    const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
    const now = new Date();

    const [
      unsettledPools,
      todayPools,
      recentPaidRuns,
      totalPlayers,
      totalRuns,
    ] = await Promise.all([
      prisma.hourlyPool.findMany({
        where: { settledAt: null, participantCount: { gt: 0 } },
        orderBy: { hourStart: 'desc' },
        take: 10,
      }),
      prisma.hourlyPool.findMany({
        where: { hourStart: { gte: todayStart, lt: tomorrowStart } },
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

    const dayDeposited = todayPools.reduce((sum, p) => sum + p.depositedUsdt, 0n);
    const dayRollover = todayPools.reduce((sum, p) => sum + p.rolloverIn, 0n);
    const dayTotal = dayDeposited + dayRollover;
    const dayParticipants = todayPools.reduce((sum, p) => sum + p.participantCount, 0);

    json(res, {
      currentDay,
      currentDayPool: {
        participants: dayParticipants,
        deposited: dayDeposited.toString(),
        rolloverIn: dayRollover.toString(),
        total: dayTotal.toString(),
        totalFormatted: formatUsdt(dayTotal),
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
