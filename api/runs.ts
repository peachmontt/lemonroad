import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getAuthenticatedPlayer } from './_lib/auth';
import { prisma } from './_lib/db';
import { currentHourBucket } from './_lib/hour';
import { currentDayBucket } from './_lib/day';
import {
  badRequest,
  json,
  serviceUnavailable,
  unauthorized,
  withMethods,
  parseJsonBody,
} from './_lib/http';
import { rateLimit } from './_lib/rate-limit';
import { getSessionId } from './_lib/session';
import { verifyEvmDepositTransaction } from './_lib/evm';
import { USDT_PER_ATTEMPT } from './_lib/pool-math';
import { scoreRun, parseDeviceType } from './_lib/anti-cheat';
import {
  isPrismaConnectionError,
  PAYMENT_DB_ERROR_MESSAGE,
  prismaOp,
} from './_lib/prisma-ops';

const postSchema = z.object({
  mode: z.enum(['free', 'paid']),
  distance: z.number().min(0).max(1_000_000),
  juiceLevel: z.string(),
  citricVelocity: z.number(),
  durationMs: z.number().int().min(0).max(3_600_000),
  depositTx: z.string().optional(),
  walletPubkey: z.string().optional(),
  paymentChain: z.enum(['solana', 'evm']).default('solana'),
});

type PaidPersistInput = {
  depositTx: string;
  walletPubkey: string;
  paymentChain: 'solana' | 'evm';
  hourBucket: string;
  playerId: string;
  playerWalletPubkey: string | null;
};

async function persistPaidDeposit(input: PaidPersistInput): Promise<string> {
  const { depositTx, walletPubkey, paymentChain, hourBucket, playerId, playerWalletPubkey } =
    input;

  console.log('[payment] paid deposit persist start', {
    depositTx: depositTx.slice(0, 16),
    walletPubkey: walletPubkey.slice(0, 8),
    paymentChain,
    hourBucket,
  });

  const existingDeposit = await prismaOp(
    'verifiedDeposit.findUnique',
    { depositTx: depositTx.slice(0, 16) },
    () => prisma.verifiedDeposit.findUnique({ where: { txSignature: depositTx } }),
  );

  if (existingDeposit?.usedAt) {
    throw new Error('DEPOSIT_ALREADY_USED');
  }

  if (!existingDeposit) {
    console.log('[payment] before blockchain verification', {
      depositTx: depositTx.slice(0, 16),
      paymentChain,
    });

    const verification =
      paymentChain === 'evm'
        ? await verifyEvmDepositTransaction(depositTx, walletPubkey)
        : await (
            await import('./_lib/solana')
          ).verifyDepositTransaction(depositTx, walletPubkey, hourBucket);

    console.log('[payment] after blockchain verification', {
      depositTx: depositTx.slice(0, 16),
      ok: verification.ok,
      error: verification.error,
    });

    if (!verification.ok) {
      throw new Error(verification.error ?? 'Invalid deposit');
    }

    try {
      await prismaOp(
        'verifiedDeposit.create',
        { depositTx: depositTx.slice(0, 16) },
        () =>
          prisma.verifiedDeposit.create({
            data: {
              txSignature: depositTx,
              walletPubkey,
              hourBucket,
              amountUsdt: USDT_PER_ATTEMPT,
              paymentChain,
            },
          }),
      );
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const raced = await prismaOp(
          'verifiedDeposit.findUnique.race',
          { depositTx: depositTx.slice(0, 16) },
          () => prisma.verifiedDeposit.findUnique({ where: { txSignature: depositTx } }),
        );
        if (raced?.usedAt) {
          throw new Error('DEPOSIT_ALREADY_USED');
        }
      } else {
        throw err;
      }
    }
  }

  await prismaOp(
    'verifiedDeposit.update.usedAt',
    { depositTx: depositTx.slice(0, 16) },
    () =>
      prisma.verifiedDeposit.update({
        where: { txSignature: depositTx },
        data: { usedAt: new Date() },
      }),
  );

  const hourStart = new Date(Number(hourBucket) * 3_600_000);

  await prismaOp('hourlyPool.upsert', { hourBucket }, () =>
    prisma.hourlyPool.upsert({
      where: { hourStart },
      create: { hourStart, depositedUsdt: USDT_PER_ATTEMPT, participantCount: 1 },
      update: { depositedUsdt: { increment: USDT_PER_ATTEMPT } },
    }),
  );

  const distinctInHour = await prismaOp('gameRun.groupBy.participants', { hourBucket }, () =>
    prisma.gameRun.groupBy({
      by: ['walletPubkey'],
      where: { mode: 'paid', hourBucket, walletPubkey: { not: null } },
    }),
  );

  const wallets = new Set(distinctInHour.map((d) => d.walletPubkey));
  wallets.add(walletPubkey);

  await prismaOp('hourlyPool.update.participantCount', { hourBucket }, () =>
    prisma.hourlyPool.update({
      where: { hourStart },
      data: { participantCount: wallets.size },
    }),
  );

  if (!playerWalletPubkey) {
    await prismaOp('player.update.walletPubkey', { playerId }, () =>
      prisma.player.update({ where: { id: playerId }, data: { walletPubkey } }),
    );
  }

  console.log('[payment] paid deposit persist complete', {
    depositTx: depositTx.slice(0, 16),
  });

  return depositTx;
}

export default withMethods({
  GET: async (req, res) => {
    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const limit = Math.min(100, Number(req.query.limit) || 50);

    try {
      const runs = await prismaOp('gameRun.findMany', { playerId: player.id }, () =>
        prisma.gameRun.findMany({
          where: { playerId: player.id },
          orderBy: { diedAt: 'desc' },
          take: limit,
        }),
      );

      json(res, {
        runs: runs.map((r) => ({
          id: r.id,
          mode: r.mode,
          distance: r.distance,
          juiceLevel: r.juiceLevel,
          citricVelocity: r.citricVelocity,
          durationMs: r.durationMs,
          diedAt: r.diedAt.toISOString(),
          hourBucket: r.hourBucket,
        })),
      });
    } catch (err) {
      console.error('[runs] GET failed', err);
      if (isPrismaConnectionError(err)) {
        return serviceUnavailable(res, 'Could not load runs, please try again');
      }
      throw err;
    }
  },

  POST: async (req, res) => {
    const sessionId = getSessionId(req) ?? req.socket?.remoteAddress ?? 'anon';
    if (!rateLimit(req, res, `runs:${sessionId}`, { max: 30, windowMs: 60 * 1000 })) return;

    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const parsed = postSchema.safeParse(parseJsonBody(req));
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const { mode, distance, juiceLevel, citricVelocity, durationMs, depositTx, walletPubkey, paymentChain } =
      parsed.data;

    const dayBucket = currentDayBucket();
    const deviceType = parseDeviceType(req);
    const antiCheat = scoreRun({ distance, durationMs, citricVelocity });

    let hourBucket: string | null = null;
    let verifiedTx: string | null = null;

    if (mode === 'paid') {
      if (!depositTx || !walletPubkey) {
        return badRequest(res, 'Paid runs require depositTx and walletPubkey');
      }

      hourBucket = currentHourBucket();

      console.log('[payment] paid run submit', {
        depositTx: depositTx.slice(0, 16),
        walletPubkey: walletPubkey.slice(0, 8),
        paymentChain,
        hourBucket,
      });

      try {
        verifiedTx = await persistPaidDeposit({
          depositTx,
          walletPubkey,
          paymentChain,
          hourBucket,
          playerId: player.id,
          playerWalletPubkey: player.walletPubkey,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'DEPOSIT_ALREADY_USED') {
          return badRequest(res, 'Deposit already used for a run');
        }
        if (msg.startsWith('Invalid deposit') || msg.includes('Transaction') || msg.includes('Wallet mismatch') || msg.includes('Deposit amount')) {
          return badRequest(res, msg);
        }
        console.error('[payment] paid run persist failed', {
          depositTx: depositTx.slice(0, 16),
          err,
        });
        if (isPrismaConnectionError(err)) {
          return serviceUnavailable(res, PAYMENT_DB_ERROR_MESSAGE);
        }
        throw err;
      }
    }

    try {
      const run = await prismaOp(
        'gameRun.create',
        { mode, playerId: player.id },
        () =>
          prisma.gameRun.create({
            data: {
              playerId: player.id,
              mode,
              distance,
              juiceLevel,
              citricVelocity,
              durationMs,
              depositTx: verifiedTx,
              hourBucket,
              dayBucket,
              walletPubkey: mode === 'paid' ? walletPubkey : null,
              deviceType,
              antiCheatScore: antiCheat.antiCheatScore,
              isValid: antiCheat.isValid,
            },
          }),
      );

      if (mode === 'free') {
        const dateVal = new Date(`${dayBucket}T00:00:00.000Z`);
        const existing = await prismaOp('dailyLeaderboard.findUnique', { playerId: player.id }, () =>
          prisma.dailyLeaderboard.findUnique({
            where: { date_playerId: { date: dateVal, playerId: player.id } },
          }),
        );

        if (!existing) {
          await prismaOp('dailyLeaderboard.create', { playerId: player.id }, () =>
            prisma.dailyLeaderboard.create({
              data: {
                date: dateVal,
                playerId: player.id,
                bestDistance: distance,
                totalRuns: 1,
              },
            }),
          );
        } else {
          await prismaOp('dailyLeaderboard.update', { playerId: player.id }, () =>
            prisma.dailyLeaderboard.update({
              where: { date_playerId: { date: dateVal, playerId: player.id } },
              data: {
                bestDistance: Math.max(existing.bestDistance, distance),
                totalRuns: { increment: 1 },
              },
            }),
          );
        }
      }

      json(res, {
        id: run.id,
        mode: run.mode,
        distance: run.distance,
        diedAt: run.diedAt.toISOString(),
        isValid: run.isValid,
      });
    } catch (err) {
      console.error('[runs] POST save failed', { mode, err });
      if (mode === 'paid' && isPrismaConnectionError(err)) {
        return serviceUnavailable(res, PAYMENT_DB_ERROR_MESSAGE);
      }
      if (isPrismaConnectionError(err)) {
        return serviceUnavailable(res, 'Could not save run, please try again');
      }
      throw err;
    }
  },
});
