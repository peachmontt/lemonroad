import { prisma } from './db';
import { currentDayBucket } from './day';
import { formatUsdt } from './pool-math';
import { sendEvmClaimPayout } from './evm';
import { buildClaimPayoutTransaction } from './solana';

function walletsMatch(stored: string, provided: string, chain: string): boolean {
  if (chain === 'evm') {
    return stored.toLowerCase() === provided.toLowerCase();
  }
  return stored === provided;
}

export interface ClaimablePayoutRow {
  id: string;
  day: string;
  place: number;
  walletPubkey: string;
  amountUsdt: string;
  amountFormatted: string;
  paymentChain: 'solana' | 'evm';
  status: 'CLAIMABLE' | 'PAID' | 'EXPIRED';
  claimTx: string | null;
  claimedAt: string | null;
}

export async function listClaimablePayouts(
  playerId: string,
  walletPubkey?: string | null,
): Promise<ClaimablePayoutRow[]> {
  const rows = await prisma.prizePayout.findMany({
    where: {
      status: 'CLAIMABLE',
      OR: [
        { playerId },
        ...(walletPubkey ? [{ playerId: null, walletPubkey }] : []),
      ],
    },
    orderBy: [{ hourStart: 'desc' }, { place: 'asc' }],
  });

  return rows.map((r) => ({
      id: r.id,
      day: currentDayBucket(r.hourStart),
      place: r.place,
      walletPubkey: r.walletPubkey,
      amountUsdt: r.amountUsdt.toString(),
      amountFormatted: formatUsdt(r.amountUsdt),
      paymentChain: r.paymentChain === 'evm' ? 'evm' : 'solana',
      status: r.status,
      claimTx: r.claimTx ?? r.txSignature,
      claimedAt: r.claimedAt?.toISOString() ?? null,
    }));
}

export interface ClaimPayoutResult {
  id: string;
  status: 'PAID';
  claimTx: string;
  amountFormatted: string;
  paymentChain: 'solana' | 'evm';
}

export async function executeClaimPayout(
  playerId: string,
  payoutId: string,
  walletPubkey: string,
): Promise<ClaimPayoutResult> {
  const payout = await prisma.prizePayout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw new Error('Payout not found');
  }
  if (payout.playerId && payout.playerId !== playerId) {
    throw new Error('Not authorized for this payout');
  }
  if (!walletsMatch(payout.walletPubkey, walletPubkey, payout.paymentChain)) {
    throw new Error('Wallet does not match payout recipient');
  }

  if (payout.status === 'PAID') {
    const tx = payout.claimTx ?? payout.txSignature;
    if (!tx) throw new Error('Payout already marked paid but missing tx');
    return {
      id: payout.id,
      status: 'PAID',
      claimTx: tx,
      amountFormatted: formatUsdt(payout.amountUsdt),
      paymentChain: payout.paymentChain === 'evm' ? 'evm' : 'solana',
    };
  }

  if (payout.status !== 'CLAIMABLE') {
    throw new Error('Payout is not claimable');
  }

  const chain = payout.paymentChain === 'evm' ? 'evm' : 'solana';
  const claimTx =
    chain === 'evm'
      ? await sendEvmClaimPayout(walletPubkey, payout.amountUsdt)
      : await buildClaimPayoutTransaction(walletPubkey, payout.amountUsdt);

  const updated = await prisma.prizePayout.updateMany({
    where: { id: payoutId, status: 'CLAIMABLE' },
    data: {
      status: 'PAID',
      claimTx,
      claimedAt: new Date(),
      playerId: payout.playerId ?? playerId,
    },
  });

  if (updated.count === 0) {
    const raced = await prisma.prizePayout.findUnique({ where: { id: payoutId } });
    const tx = raced?.claimTx ?? raced?.txSignature;
    if (raced?.status === 'PAID' && tx) {
      return {
        id: payoutId,
        status: 'PAID',
        claimTx: tx,
        amountFormatted: formatUsdt(raced.amountUsdt),
        paymentChain: chain,
      };
    }
    throw new Error('Claim failed — payout may have been claimed already');
  }

  return {
    id: payoutId,
    status: 'PAID',
    claimTx,
    amountFormatted: formatUsdt(payout.amountUsdt),
    paymentChain: chain,
  };
}
