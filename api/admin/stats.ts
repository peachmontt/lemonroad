import { prisma } from '../_lib/db';
import { json, unauthorized, withMethods } from '../_lib/http';
import { isAdminAuthorized } from '../_lib/session';
import { currentDayBucket, dayBucketToDate, getNextDailyResetAt, RESET_TIMEZONE_LABEL } from '../_lib/day';
import { getNextWeeklyResetAt } from '../../shared/gameTime';
import {
  DAILY_FREE_POOL_USDT,
  dayBucketDateOrFilter,
} from '../_lib/daily-pool';
import { formatUsdt } from '../_lib/pool-math';
import { getPayoutTotals } from '../_lib/payout-stats';

export default withMethods({
  GET: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const currentDay = currentDayBucket();
    const todayStart = dayBucketToDate(currentDay);
    const now = new Date();

    const [
      unsettledPools,
      todayPool,
      recentPaidRuns,
      totalPlayers,
      totalRuns,
      todayFreePlayers,
      payoutTotals,
    ] = await Promise.all([
      prisma.hourlyPool.findMany({
        where: { settledAt: null, participantCount: { gt: 0 } },
        orderBy: { hourStart: 'desc' },
        take: 10,
      }),
      prisma.hourlyPool.findUnique({ where: { hourStart: todayStart } }),
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
      getPayoutTotals(),
    ]);

    const dayDeposited = todayPool?.depositedUsdt ?? 0n;
    const dayRollover = todayPool?.rolloverIn ?? 0n;
    const dayTotal = dayDeposited + dayRollover;
    const dayParticipants = todayPool?.participantCount ?? 0;

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
        day: currentDayBucket(p.hourStart),
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
        dayBucket: r.dayBucket,
      })),
      totals: {
        players: totalPlayers,
        runs: totalRuns,
        totalPaidUsdt: payoutTotals.totalPaidUsdt,
        totalPaidFormatted: payoutTotals.totalPaidFormatted,
        pendingPayoutsUsdt: payoutTotals.pendingPayoutsUsdt,
        pendingPayoutsFormatted: payoutTotals.pendingPayoutsFormatted,
      },
      serverTime: now.toISOString(),
      nextDailyResetAt: getNextDailyResetAt(now).toISOString(),
      nextWeeklyResetAt: getNextWeeklyResetAt(now).toISOString(),
      resetTimezone: RESET_TIMEZONE_LABEL,
    });
  },
});
