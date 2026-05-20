import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import type { PlayerResponse } from '../lib/api';

interface ProfileBarProps {
  player: PlayerResponse | null;
  onSaveName: (name: string, wallet?: string) => Promise<unknown>;
}

export function ProfileBar({ player, onSaveName }: ProfileBarProps) {
  const { publicKey } = useWallet();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player?.displayName ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSaveName(name.trim(), publicKey?.toBase58());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-bar">
      <div className="profile-name-row">
        {editing ? (
          <>
            <input
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              aria-label="Display name"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? '...' : 'SAVE'}
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setEditing(false);
                setName(player?.displayName ?? '');
              }}
            >
              cancel
            </button>
          </>
        ) : (
          <>
            <span className="profile-label">
              {player?.displayName ?? 'Anonymous Lemon'}
            </span>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setName(player?.displayName ?? '');
                setEditing(true);
              }}
            >
              rename
            </button>
          </>
        )}
      </div>
      <WalletMultiButton className="wallet-btn" />
    </div>
  );
}
