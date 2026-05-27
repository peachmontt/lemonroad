import { SKINS, type SkinId } from '../game/skins';
import type { PlayerProgress } from '../game/progression';

interface SkinsTabProps {
  progress: PlayerProgress;
  onSelect: (id: SkinId) => void;
}

export function SkinsTab({ progress, onSelect }: SkinsTabProps) {
  return (
    <div className="lemon-club-tab-panel">
      <p className="lemon-club-tagline">Zero utility. Maximum drip.</p>
      <div className="lemon-club-skin-grid">
        {SKINS.map((skin) => {
          const unlocked = progress.unlockedSkins.includes(skin.id);
          const selected = progress.selectedSkin === skin.id;
          return (
            <div
              key={skin.id}
              className={`lemon-club-card lemon-club-skin ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}`}
            >
              <span className="lemon-club-skin-emoji">{skin.emoji}</span>
              <h4>{skin.name}</h4>
              <p className="lemon-club-muted">{unlocked ? skin.description : skin.unlockHint}</p>
              {unlocked ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={selected}
                  onClick={() => onSelect(skin.id)}
                >
                  {selected ? 'Equipped' : 'Select'}
                </button>
              ) : (
                <span className="lemon-club-locked-label">Locked</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
