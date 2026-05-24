import { useEffect, useState } from 'react';
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
  const [expanded, setExpanded] = useState(false);
  const [tagline] = useState(
    () => FUNNY_TAGLINES[Math.floor(Math.random() * FUNNY_TAGLINES.length)],
  );

  useEffect(() => {
    setExpanded(false);
  }, [walletPubkey]);

  return (
    <div
      className={`wallet-confirmed-card${expanded ? ' wallet-confirmed-card--expanded' : ''}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="wallet-confirmed-toggle"
        aria-expanded={expanded}
        aria-controls="wallet-confirmed-details"
        aria-label="View saved wallet details"
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="wallet-confirmed-check" aria-hidden="true">
          ✓
        </span>
        <span className="wallet-confirmed-badge">Daily prize eligible</span>
        <span className="wallet-confirmed-chevron" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      <div
        id="wallet-confirmed-details"
        className="wallet-confirmed-details"
        aria-hidden={!expanded}
      >
        <div className="wallet-confirmed-details-inner">
          <p className="wallet-confirmed-wallet-label">Wallet for rewards:</p>
          <p className="wallet-confirmed-address" title={walletPubkey}>
            {formatShortWallet(walletPubkey)}
          </p>
          <p className="wallet-confirmed-info">
            Rewards will be sent to this wallet if you reach the daily top players.
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
      </div>
    </div>
  );
}
