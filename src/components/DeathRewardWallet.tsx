import { LemonLoader } from './LemonLoader';
import { WalletLinkPrompt } from './WalletLinkPrompt';
import { formatShortWallet } from '../lib/solanaAddress';

interface DeathRewardWalletProps {
  walletLoading: boolean;
  walletPubkey: string | null;
  inTop3: boolean;
  dismissed: boolean;
  changingWallet: boolean;
  canPrompt: boolean;
  onSave: (walletPubkey: string) => Promise<void>;
  onDismiss: () => void;
  onChangeWallet: () => void;
  onCancelChange: () => void;
}

export function DeathRewardWallet({
  walletLoading,
  walletPubkey,
  inTop3,
  dismissed,
  changingWallet,
  canPrompt,
  onSave,
  onDismiss,
  onChangeWallet,
  onCancelChange,
}: DeathRewardWalletProps) {
  if (walletLoading) {
    return (
      <div className="death-reward-wallet death-reward-wallet--loading">
        <LemonLoader label="checking wallet…" />
      </div>
    );
  }

  if (walletPubkey && !changingWallet) {
    return (
      <div className="death-reward-wallet death-reward-wallet--saved">
        <p className="death-reward-wallet-saved">
          Reward wallet saved:{' '}
          <span className="death-reward-wallet-address" title={walletPubkey}>
            {formatShortWallet(walletPubkey)}
          </span>
          <button
            type="button"
            className="death-reward-wallet-change"
            onClick={onChangeWallet}
          >
            Change
          </button>
        </p>
      </div>
    );
  }

  if (inTop3 && !dismissed && canPrompt) {
    return (
      <div className="death-reward-wallet death-reward-wallet--prompt">
        <WalletLinkPrompt
          variant={walletPubkey ? 'change' : 'initial'}
          embedded
          onSave={onSave}
          onDismiss={onDismiss}
          onCancel={walletPubkey ? onCancelChange : undefined}
        />
      </div>
    );
  }

  if (inTop3 && !dismissed && !canPrompt && !walletPubkey) {
    return (
      <p className="death-reward-wallet-hint death-reward-wallet-hint--pending">
        Saving your run… wallet options appear in a moment.
      </p>
    );
  }

  if (!walletPubkey && !inTop3 && !dismissed) {
    return (
      <p className="death-reward-wallet-hint">
        Add a wallet later if you reach the reward zone.
      </p>
    );
  }

  return null;
}
