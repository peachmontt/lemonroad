import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { isValidSolanaWalletAddress } from '../lib/solanaAddress';

interface WalletLinkPromptProps {
  onSave: (walletPubkey: string) => Promise<void>;
  onDismiss: () => void;
  variant?: 'initial' | 'change';
  embedded?: boolean;
  onCancel?: () => void;
}

const VALIDATION_ERROR = 'This does not look like a valid Solana wallet address.';

export function WalletLinkPrompt({
  onSave,
  onDismiss,
  variant = 'initial',
  embedded = false,
  onCancel,
}: WalletLinkPromptProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInvalid, setShowInvalid] = useState(false);

  const trimmed = value.trim();
  const isValid = isValidSolanaWalletAddress(trimmed);
  const isChange = variant === 'change';

  const rejectInvalid = () => {
    setShowInvalid(true);
    setError(VALIDATION_ERROR);
  };

  const handleSave = async () => {
    if (!isValid) {
      rejectInvalid();
      return;
    }

    setSaving(true);
    setError(null);
    setShowInvalid(false);

    try {
      await onSave(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save wallet');
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void handleSave();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void handleSave();
  };

  return (
    <form
      className={`wallet-link-prompt${embedded ? ' wallet-link-prompt--embedded' : ''}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <p className="wallet-link-title">
        {isChange
          ? 'Update your Solana wallet for daily rewards.'
          : 'Add wallet to receive your prize if you stay in Top 3.'}
      </p>

      <label className="wallet-link-label" htmlFor="wallet-address-input">
        Solana wallet
      </label>
      <input
        id="wallet-address-input"
        className={`wallet-link-input${showInvalid ? ' wallet-link-input--invalid' : ''}`}
        type="text"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Your public wallet address"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
          setShowInvalid(false);
        }}
        onBlur={() => {
          if (trimmed && !isValid) rejectInvalid();
        }}
        onKeyDown={handleInputKeyDown}
        disabled={saving}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={showInvalid}
        aria-describedby={
          error ? 'wallet-link-error' : 'wallet-link-seed-warning'
        }
      />

      {error && (
        <p id="wallet-link-error" className="wallet-link-error" role="alert">
          {error}
        </p>
      )}

      <p id="wallet-link-seed-warning" className="wallet-link-help">
        Never enter your seed phrase.
      </p>

      <div className="wallet-link-actions">
        <button
          type="submit"
          className="btn btn-primary wallet-link-save"
          disabled={saving || !isValid}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {isChange && onCancel ? (
          <button
            type="button"
            className="btn btn-secondary wallet-link-later"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary wallet-link-later"
            onClick={onDismiss}
            disabled={saving}
          >
            Add later
          </button>
        )}
      </div>
    </form>
  );
}
