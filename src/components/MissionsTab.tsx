import type { PlayerProgress } from '../game/progression';
import type { DailyMission } from '../game/missions';
import { getLemonLevel } from '../lib/lemonLevels';

interface MissionsTabProps {
  progress: PlayerProgress;
  onClaim: (missionId: string) => void;
}

function MissionCard({
  mission,
  onClaim,
}: {
  mission: DailyMission;
  onClaim: (id: string) => void;
}) {
  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));

  return (
    <div className={`lemon-club-card ${mission.completed ? 'completed' : ''}`}>
      <h4>{mission.title}</h4>
      <p className="lemon-club-muted">{mission.description}</p>
      <div className="lemon-club-progress">
        <div className="lemon-club-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="lemon-club-progress-label">
        {mission.progress}/{mission.target}
      </p>
      <p className="lemon-club-reward">Reward: {mission.rewardLabel}</p>
      {mission.completed && !mission.claimed && (
        <button type="button" className="btn btn-secondary lemon-club-claim" onClick={() => onClaim(mission.id)}>
          Claim
        </button>
      )}
      {mission.claimed && <p className="lemon-club-claimed">Claimed ✓</p>}
    </div>
  );
}

export function MissionsTab({ progress, onClaim }: MissionsTabProps) {
  const level = getLemonLevel(progress.lemonXp);

  return (
    <div className="lemon-club-tab-panel">
      <p className="lemon-club-tagline">Do dumb things. Get shiny lemons.</p>
      <p className="lemon-club-stat">Lemon XP: {progress.lemonXp}</p>
      <p className="lemon-club-stat lemon-club-level">{level.label}</p>
      {progress.streakDays > 0 && (
        <p className="lemon-club-stat">Daily streak: {progress.streakDays} days 🔥</p>
      )}
      {progress.activeDailyMissions.map((m) => (
        <MissionCard key={m.id} mission={m} onClaim={onClaim} />
      ))}
    </div>
  );
}
