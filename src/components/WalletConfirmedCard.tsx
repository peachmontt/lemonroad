import { useState } from 'react';
import { formatShortWallet } from '../lib/solanaAddress';

const FUNNY_TAGLINES = [
  'You are officially juice-compatible.',
  'This wallet is now fighting for lemons.',
  'If you hit the leaderboard, rewards go here.',
] as const;

interface WalletConfirmedCardProps {
  walletPubkey: string;
  onChangeWallet: () => void;
}

export function WalletConfirmedCard({ walletPubkey, onChangeWallet }: WalletConfirmedCardProps) {
  const [tagline] = useState(
    () => FUNNY_TAGLINES[Math.floor(Math.random() * FUNNY_TAGLINES.length)],
  );

  return (
    <div className="wallet-confirmed-card" role="status" aria-live="polite">
      <div className="wallet-confirmed-header">
        <span className="wallet-confirmed-check" aria-hidden="true">
          ✓
        </span>
        <span className="wallet-confirmed-badge">Daily prize eligible</span>
      </div>

      <p className="wallet-confirmed-title">Wallet connected successfully.</p>

      <p className="wallet-confirmed-address" title={walletPubkey}>
        {formatShortWallet(walletPubkey)}
      </p>

      <p className="wallet-confirmed-info">
        This wallet will receive rewards if your score reaches the daily top players.
      </p>

      <p className="wallet-confirmed-tagline">{tagline}</p>

      <button
        type="button"
        className="btn btn-secondary btn-sm wallet-confirmed-change"
        onClick={onChangeWallet}
      >
        Change wallet
      </button>
    </div>
  );
}
