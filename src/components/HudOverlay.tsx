import type { GameSnapshot } from '../game/types';

interface HudOverlayProps {
  snapshot: GameSnapshot;
  onToggleMute: () => void;
}

export function HudOverlay({ snapshot, onToggleMute }: HudOverlayProps) {
  const velocity = snapshot.citricVelocity.toFixed(2);
  return (
    <div className="overlay hud-overlay" aria-live="polite">
      <div className="hud-top">
        <span className="hud-logo">LEMON ROAD</span>
        <button type="button" className="mute-btn" onClick={onToggleMute} aria-label={snapshot.muted ? 'Unmute' : 'Mute'}>
          {snapshot.muted ? '🔇 UNMUTE' : '🔊 MUTE'}
        </button>
      </div>
      <div className="hud-stats">
        <p>{Math.floor(snapshot.distance)}m</p>
        <p>juice level: {snapshot.juiceLevel}</p>
        <p>citric velocity: {velocity}</p>
      </div>
      {snapshot.activeEventLabel && (
        <p className="hud-event">{snapshot.activeEventLabel}</p>
      )}
    </div>
  );
}
