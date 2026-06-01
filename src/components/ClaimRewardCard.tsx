import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount } from 'wagmi';
import type { ClaimablePayout } from '../lib/api';
import { claimDegenPayout } from '../lib/api';
import { solanaExplorerTxUrl } from '../config/explorer';
import { useClaimablePayouts } from '../hooks/useClaimablePayouts';

export const DEGEN_PAYOUT_STATUS_LABEL: Record<string, string> = {
  CLAIMABLE: 'claimable',
  PAID: 'paid',
  EXPIRED: 'expired',
};

export const DEGEN_PAYOUT_STATUS_CLASS: Record<string, string> = {
  CLAIMABLE: 'status-claimable',
  PAID: 'status-paid',
  EXPIRED: 'status-rejected',
};

function evmExplorerTxUrl(hash: string): string {
  const chainId = Number(import.meta.env.VITE_EVM_CHAIN_ID ?? 137);
  if (chainId === 1) return `https://etherscan.io/tx/${hash}`;
  return `https://polygonscan.com/tx/${hash}`;
}

interface ClaimRewardCardProps {
  compact?: boolean;
  playerWalletPubkey?: string | null;
  /** When provided, skip internal fetch (for shared hook usage). */
  payouts?: ClaimablePayout[];
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  onError?: (message: string | null) => void;
}

export function ClaimRewardCard({
  compact = false,
  playerWalletPubkey,
  payouts: externalPayouts,
  loading: externalLoading,
  error: externalError,
  onReload,
  onError,
}: ClaimRewardCardProps) {
  const internal = useClaimablePayouts(externalPayouts === undefined);
  const payouts = externalPayouts ?? internal.payouts;
  const loading = externalLoading ?? internal.loading;
  const error = externalError ?? internal.error;
  const reload = onReload ?? internal.reload;
  const setError = onError ?? internal.setError;

  const { publicKey } = useWallet();
  const { address: evmAddress } = useAccount();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [lastClaimTx, setLastClaimTx] = useState<{ tx: string; chain: 'solana' | 'evm' } | null>(
    null,
  );

  if (loading && payouts.length === 0) {
    if (compact) return null;
    return <p className="lemon-club-muted">Loading claimable rewards…</p>;
  }

  if (payouts.length === 0 && !error && compact) {
    return null;
  }

  const handleClaim = async (payout: ClaimablePayout) => {
    const wallet =
      payout.paymentChain === 'evm'
        ? evmAddress ?? null
        : publicKey?.toBase58() ?? null;

    if (!wallet) {
      setError(
        payout.paymentChain === 'evm'
          ? 'Connect your EVM wallet (same address you used for Degen runs).'
          : 'Connect your Solana wallet (same address you used for Degen runs).',
      );
      return;
    }

    if (payout.paymentChain !== 'evm' && payout.walletPubkey !== wallet) {
      setError('Connected wallet does not match the winning address for this payout.');
      return;
    }
    if (
      payout.paymentChain === 'evm' &&
      payout.walletPubkey.toLowerCase() !== wallet.toLowerCase()
    ) {
      setError('Connected wallet does not match the winning address for this payout.');
      return;
    }

    setClaimingId(payout.id);
    setError(null);
    setLastClaimTx(null);
    try {
      const result = await claimDegenPayout(payout.id, wallet);
      setLastClaimTx({ tx: result.claimTx, chain: result.paymentChain });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Claim failed');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className={`claim-rewards-tab ${compact ? 'claim-rewards-tab--compact' : ''}`}>
      {!compact && (
        <>
          <p className="lemon-club-section-lead">
            Degen pool prizes are claimable after the day finalizes (~21:05 GMT+3). Use the same
            chain wallet you played with.
          </p>
          {playerWalletPubkey && (
            <p className="lemon-club-muted claim-rewards-saved-wallet">
              Saved profile wallet: {playerWalletPubkey.slice(0, 6)}…
              {playerWalletPubkey.slice(-4)}
            </p>
          )}
        </>
      )}

      {compact && payouts.length > 0 && (
        <p className="claim-rewards-compact-lead">You have Degen rewards ready to claim</p>
      )}

      {error && <p className="claim-rewards-error">{error}</p>}

      {lastClaimTx && (
        <p className="claim-rewards-success">
          Paid!{' '}
          <a
            href={
              lastClaimTx.chain === 'evm'
                ? evmExplorerTxUrl(lastClaimTx.tx)
                : solanaExplorerTxUrl(lastClaimTx.tx)
            }
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        </p>
      )}

      {payouts.length === 0 ? (
        !compact ? (
          <p className="lemon-club-muted">No claimable Degen rewards right now.</p>
        ) : null
      ) : (
        <ul className="claim-rewards-list">
          {payouts.map((p) => (
            <li key={p.id} className="claim-reward-row">
              <div className="claim-reward-meta">
                <strong>#{p.place}</strong> · {p.day} · {p.amountFormatted} USDT
                <span className={`claim-reward-chain claim-reward-chain--${p.paymentChain}`}>
                  {p.paymentChain === 'evm' ? 'EVM' : 'Solana'}
                </span>
              </div>
              <button
                type="button"
                className="claim-reward-btn"
                disabled={claimingId === p.id}
                onClick={() => void handleClaim(p)}
              >
                {claimingId === p.id ? 'Claiming…' : 'Claim'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
