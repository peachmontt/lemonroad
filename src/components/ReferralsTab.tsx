import { useState } from 'react';
import { REFERRAL_REWARDS, getReferralShareUrl } from '../game/referrals';
import type { PlayerProgress } from '../game/progression';
import type { ReferralStats } from '../lib/api';

interface ReferralsTabProps {
  progress: PlayerProgress;
  referralStats?: ReferralStats | null;
  referralBackendReady?: boolean;
  onSimulateReferral?: () => void;
}

export function ReferralsTab({
  progress,
  referralStats,
  referralBackendReady = false,
  onSimulateReferral,
}: ReferralsTabProps) {
  const [copied, setCopied] = useState(false);
  const code = referralStats?.code ?? progress.referralCode;
  const qualifiedCount = referralStats?.qualifiedCount ?? progress.referralCount;
  const pendingCount = referralStats?.pendingCount ?? 0;
  const shareUrl = referralStats?.shareUrl ?? getReferralShareUrl(code);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lemon Road',
          text: 'No pay-to-win. Just stupid lemon rewards.',
          url: shareUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      void copyLink();
    }
  };

  return (
    <div className="lemon-club-tab-panel">
      <p className="lemon-club-tagline">Invite friends. Unlock cosmetics.</p>
      <p className="lemon-club-muted">
        No pay-to-win. No invite-to-earn. Just stupid lemon rewards.
      </p>
      {!referralBackendReady && (
        <p className="lemon-club-preview-banner">Syncing referral stats…</p>
      )}

      <div className="lemon-club-card">
        <p className="lemon-club-code">{code}</p>
        <p className="lemon-club-muted">Friends invited: {qualifiedCount}</p>
        {pendingCount > 0 && (
          <p className="lemon-club-muted">
            {pendingCount} friend{pendingCount === 1 ? '' : 's'} signed up — waiting for first run
          </p>
        )}
      </div>

      <ul className="lemon-club-reward-list">
        {REFERRAL_REWARDS.map((r) => (
          <li key={r.friends}>
            {r.friends} friends → {r.label}
          </li>
        ))}
      </ul>

      <div className="lemon-club-actions">
        <button type="button" className="btn btn-secondary" onClick={() => void copyLink()}>
          {copied ? 'Copied!' : 'Copy referral link'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => void share()}>
          Share
        </button>
      </div>

      {import.meta.env.DEV && onSimulateReferral && (
        <button type="button" className="footer-link lemon-club-dev-btn" onClick={onSimulateReferral}>
          Simulate referral +1 (dev)
        </button>
      )}
    </div>
  );
}
