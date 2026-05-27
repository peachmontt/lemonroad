import { BADGES, DEATH_TITLES, type DeathTitleId } from '../game/badges';
import type { PlayerProgress } from '../game/progression';

interface BadgesTabProps {
  progress: PlayerProgress;
  onSelectTitle: (id: DeathTitleId | null) => void;
}

export function BadgesTab({ progress, onSelectTitle }: BadgesTabProps) {
  return (
    <div className="lemon-club-tab-panel">
      <h3 className="lemon-club-section-title">Badges</h3>
      <div className="lemon-club-badge-grid">
        {BADGES.map((badge) => {
          const unlocked = progress.unlockedBadges.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`lemon-club-card lemon-club-badge ${unlocked ? 'unlocked' : 'locked'}`}
            >
              <span className="lemon-club-badge-emoji">{badge.emoji}</span>
              <h4>{badge.name}</h4>
              <p className="lemon-club-muted">{unlocked ? badge.description : badge.unlockHint}</p>
            </div>
          );
        })}
      </div>

      <h3 className="lemon-club-section-title">Death Titles</h3>
      <div className="lemon-club-title-list">
        {DEATH_TITLES.map((title) => {
          const unlocked = progress.unlockedDeathTitles.includes(title.id);
          const selected = progress.selectedDeathTitle === title.id;
          return (
            <div
              key={title.id}
              className={`lemon-club-card lemon-club-title ${unlocked ? 'unlocked' : 'locked'}`}
            >
              <span>{title.emoji}</span>
              <div>
                <h4>{title.name}</h4>
                <p className="lemon-club-muted">{unlocked ? title.name : title.unlockHint}</p>
              </div>
              {unlocked && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={selected}
                  onClick={() => onSelectTitle(title.id as DeathTitleId)}
                >
                  {selected ? 'Active' : 'Equip'}
                </button>
              )}
            </div>
          );
        })}
        {progress.selectedDeathTitle && (
          <button
            type="button"
            className="footer-link lemon-club-clear-title"
            onClick={() => onSelectTitle(null)}
          >
            Clear title
          </button>
        )}
      </div>
    </div>
  );
}
