import { useEffect, useState } from 'react';
import type { PlayerProgress, UnlockNotification } from '../game/progression';
import type { SkinId } from '../game/skins';
import type { DeathTitleId } from '../game/badges';
import { BadgesTab } from './BadgesTab';
import { HallOfShameTab } from './HallOfShameTab';
import { LemonClubTabs, type LemonClubTab } from './LemonClubTabs';
import { MissionsTab } from './MissionsTab';
import { ReferralsTab } from './ReferralsTab';
import { SkinsTab } from './SkinsTab';
import { WeeklyCupTab } from './WeeklyCupTab';
import { TopLemonsTab } from './TopLemonsTab';

import type { ReferralStats } from '../lib/api';

interface LemonClubMenuProps {
  open: boolean;
  initialTab?: LemonClubTab;
  progress: PlayerProgress;
  referralStats?: ReferralStats | null;
  referralBackendReady?: boolean;
  onClose: () => void;
  onSelectSkin: (id: SkinId) => void;
  onSelectDeathTitle: (id: DeathTitleId | null) => void;
  onClaimMission: (id: string) => void;
  onSimulateReferral?: () => void;
  displayName?: string;
}

export function LemonClubMenu({
  open,
  initialTab = 'missions',
  progress,
  referralStats,
  referralBackendReady,
  onClose,
  onSelectSkin,
  onSelectDeathTitle,
  onClaimMission,
  onSimulateReferral,
  displayName,
}: LemonClubMenuProps) {
  const [tab, setTab] = useState<LemonClubTab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('lemon-club-open');
    document.documentElement.classList.add('lemon-club-open');
    return () => {
      document.body.classList.remove('lemon-club-open');
      document.documentElement.classList.remove('lemon-club-open');
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="lemon-club-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lemon-club-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lemon-club-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lemon-club-header">
          <div className="lemon-club-header-text">
            <h2 id="lemon-club-title">Lemon Club 🍋</h2>
            <p className="lemon-club-subtitle">Complete chaos. Unlock stupid rewards.</p>
          </div>
          <button type="button" className="lemon-club-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="lemon-club-tabs-wrap">
          <LemonClubTabs active={tab} onChange={setTab} />
        </div>

        <div className="lemon-club-body">
          {tab === 'missions' && (
            <MissionsTab progress={progress} onClaim={onClaimMission} />
          )}
          {tab === 'skins' && <SkinsTab progress={progress} onSelect={onSelectSkin} />}
          {tab === 'badges' && (
            <BadgesTab progress={progress} onSelectTitle={onSelectDeathTitle} />
          )}
          {tab === 'referrals' && (
            <ReferralsTab
              progress={progress}
              referralStats={referralStats}
              referralBackendReady={referralBackendReady}
              onSimulateReferral={onSimulateReferral}
            />
          )}
          {tab === 'weekly' && <WeeklyCupTab progress={progress} />}
          {tab === 'shame' && <HallOfShameTab />}
          {tab === 'top-lemons' && (
            <TopLemonsTab
              totalLemonXp={progress.lemonXp}
              displayName={displayName}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function formatUnlockLine(unlock: UnlockNotification): string {
  if (unlock.kind === 'title') {
    return `Title unlocked: ${unlock.label} ${unlock.emoji}`;
  }
  if (unlock.kind === 'skin') {
    return `Skin unlocked: ${unlock.label} ${unlock.emoji}`;
  }
  return `Badge unlocked: ${unlock.label} ${unlock.emoji}`;
}
