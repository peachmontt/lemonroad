import { useState } from 'react';

interface WalletLinkPromptProps {
  onSave: (walletPubkey: string) => Promise<void>;
  onSkip: () => void;
}

/** Validates a Solana public key (base58, 32–44 chars). */
function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
}

export function WalletLinkPrompt({ onSave, onSkip }: WalletLinkPromptProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!isValidSolanaAddress(trimmed)) {
      setError('Enter a valid Solana wallet address');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save wallet');
      setSaving(false);
    }
  };

  return (
    <div className="wallet-link-prompt">
      <p className="wallet-link-title">Add your Solana wallet to receive daily prizes</p>
      <input
        className="wallet-link-input"
        type="text"
        placeholder="Wallet address (Solana / Pumpfun)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={saving}
        autoComplete="off"
        spellCheck={false}
      />
      {error && <p className="wallet-link-error">{error}</p>}
      <div className="wallet-link-actions">
        <button
          className="wallet-link-save"
          onClick={handleSave}
          disabled={saving || !value.trim()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="wallet-link-skip" onClick={onSkip} disabled={saving}>
          Skip
        </button>
      </div>
    </div>
  );
}
