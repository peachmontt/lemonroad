import { prisma } from '../_lib/db';
import { json, unauthorized, withMethods } from '../_lib/http';
import { isAdminAuthorized } from '../_lib/session';
import { currentDayBucket, dayBucketToDate, getNextDailyResetAt, RESET_TIMEZONE_LABEL } from '../_lib/day';
import { getNextWeeklyResetAt } from '../../shared/gameTime';
import { getNextHourlySettleAt } from '../../shared/hour';
import {
  DAILY_FREE_POOL_USDT,
  dayBucketDateOrFilter,
} from '../_lib/daily-pool';
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
      todayFreePlayers,
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
      prisma.dailyLeaderboard.count({
        where: dayBucketDateOrFilter(currentDay),
      }),
    ]);

    const dayDeposited = todayPools.reduce((sum, p) => sum + p.depositedUsdt, 0n);
    const dayRollover = todayPools.reduce((sum, p) => sum + p.rolloverIn, 0n);
    const dayTotal = dayDeposited + dayRollover;
    const dayParticipants = todayPools.reduce((sum, p) => sum + p.participantCount, 0);

    json(res, {
      currentDay,
      currentDayPool: {
        participants: todayFreePlayers,
        deposited: '0',
        rolloverIn: '0',
        total: String(DAILY_FREE_POOL_USDT),
        totalFormatted: `${DAILY_FREE_POOL_USDT} USDT`,
      },
      paidDayPool: {
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
      nextDailyResetAt: getNextDailyResetAt(now).toISOString(),
      nextWeeklyResetAt: getNextWeeklyResetAt(now).toISOString(),
      nextDegenPayoutAt: getNextHourlySettleAt(now).toISOString(),
      resetTimezone: RESET_TIMEZONE_LABEL,
    });
  },
});
