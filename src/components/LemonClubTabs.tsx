export type LemonClubTab =
  | 'missions'
  | 'skins'
  | 'badges'
  | 'referrals'
  | 'weekly'
  | 'shame';

export const LEMON_CLUB_TABS: { id: LemonClubTab; label: string; shortLabel?: string }[] = [
  { id: 'missions', label: 'Missions' },
  { id: 'skins', label: 'Skins' },
  { id: 'badges', label: 'Badges' },
  { id: 'referrals', label: 'Referrals', shortLabel: 'Refs' },
  { id: 'weekly', label: 'Weekly Cup', shortLabel: 'Cup' },
  { id: 'shame', label: 'Hall of Shame', shortLabel: 'Shame' },
];

interface LemonClubTabsProps {
  active: LemonClubTab;
  onChange: (tab: LemonClubTab) => void;
}

export function LemonClubTabs({ active, onChange }: LemonClubTabsProps) {
  return (
    <div className="lemon-club-tabs" role="tablist" aria-label="Lemon Club sections">
      {LEMON_CLUB_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`lemon-club-tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="lemon-club-tab-label lemon-club-tab-label--full">{tab.label}</span>
          <span className="lemon-club-tab-label lemon-club-tab-label--short">
            {tab.shortLabel ?? tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
