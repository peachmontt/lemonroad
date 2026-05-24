import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { isValidSolanaWalletAddress } from '../lib/solanaAddress';

interface WalletLinkPromptProps {
  onSave: (walletPubkey: string) => Promise<void>;
  onDismiss: () => void;
  variant?: 'initial' | 'change';
  onCancel?: () => void;
}

const VALIDATION_ERROR = 'Please enter a valid Solana wallet address.';

export function WalletLinkPrompt({
  onSave,
  onDismiss,
  variant = 'initial',
  onCancel,
}: WalletLinkPromptProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
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
    <>
      <form className="wallet-link-prompt" onSubmit={handleSubmit} noValidate>
        <p className="wallet-link-title">
          {isChange
            ? 'Update your Solana wallet address for the daily prize draw.'
            : 'Add your Solana wallet address to participate in the daily prize draw.'}
        </p>

        <label className="wallet-link-label" htmlFor="wallet-address-input">
          Solana wallet address
        </label>
        <input
          id="wallet-address-input"
          className={`wallet-link-input${showInvalid ? ' wallet-link-input--invalid' : ''}`}
          type="text"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
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
          aria-describedby={error ? 'wallet-link-error' : isChange ? undefined : 'wallet-link-skip-help'}
        />

        {error && (
          <p id="wallet-link-error" className="wallet-link-error" role="alert">
            {error}
          </p>
        )}

        <div className="wallet-link-actions">
          <button
            type="submit"
            className="btn btn-primary wallet-link-save"
            disabled={saving || !isValid}
          >
            {saving ? 'Saving…' : isChange ? 'Update wallet' : 'Save wallet'}
          </button>

          {isChange && onCancel && (
            <button
              type="button"
              className="btn btn-secondary wallet-link-skip"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          )}

          {!isChange && (
            <button
              type="button"
              className="btn btn-secondary wallet-link-skip"
              onClick={() => setShowSkipConfirm(true)}
              disabled={saving}
            >
              Skip prize draw
            </button>
          )}
        </div>

        {!isChange && (
          <p id="wallet-link-skip-help" className="wallet-link-help">
            If you skip this step, you can still play, but you will not be eligible for the daily prize
            draw.
          </p>
        )}
      </form>

      {showSkipConfirm && (
        <div
          className="wallet-skip-modal-backdrop"
          onClick={() => setShowSkipConfirm(false)}
          role="presentation"
        >
          <div
            className="modal-panel wallet-skip-modal-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-skip-modal-title"
          >
            <h2 id="wallet-skip-modal-title">Skip prize draw?</h2>
            <p className="modal-disclaimer">
              Are you sure you want to skip? Without a wallet address, you cannot participate in the
              daily prize draw.
            </p>
            <div className="wallet-skip-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSkipConfirm(false)}
              >
                Go back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowSkipConfirm(false);
                  onDismiss();
                }}
              >
                Yes, skip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
