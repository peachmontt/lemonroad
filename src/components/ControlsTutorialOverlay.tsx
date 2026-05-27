import { useEffect, useState } from 'react';

const TUTORIAL_KEY = 'lemonRoadControlsTutorialSeen';
const LEGACY_KEY = 'lemonroad_controls_seen';

export function hasSeenControlsTutorial(): boolean {
  try {
    return (
      localStorage.getItem(TUTORIAL_KEY) === 'true' ||
      localStorage.getItem(LEGACY_KEY) === 'true'
    );
  } catch {
    return false;
  }
}

export function markControlsTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    localStorage.setItem(LEGACY_KEY, 'true');
  } catch {
    /* ignore */
  }
}

function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = () => setIsTouch(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isTouch;
}

interface ControlsTutorialOverlayProps {
  onDismiss: () => void;
}

function MobileTutorialHints() {
  return (
    <div className="controls-tutorial-hints controls-tutorial-hints--mobile">
      <div className="controls-tutorial-hint">
        <div className="controls-tutorial-phone" aria-hidden="true">
          <span className="controls-tutorial-phone-body">📱</span>
        </div>
        <span className="controls-tutorial-hint-label">Tilt</span>
      </div>
      <span className="controls-tutorial-or">or</span>
      <div className="controls-tutorial-hint">
        <div className="controls-tutorial-drag-track" aria-hidden="true">
          <span className="controls-tutorial-center-line" />
          <span className="controls-tutorial-finger">👆</span>
        </div>
        <span className="controls-tutorial-hint-label">Drag</span>
      </div>
    </div>
  );
}

function DesktopTutorialHints() {
  return (
    <div className="controls-tutorial-hints controls-tutorial-hints--desktop">
      <div className="controls-tutorial-drag-track controls-tutorial-drag-track--wide" aria-hidden="true">
        <span className="controls-tutorial-center-line" />
        <span className="controls-tutorial-cursor">🖱️</span>
      </div>
    </div>
  );
}

export function ControlsTutorialOverlay({ onDismiss }: ControlsTutorialOverlayProps) {
  const isTouch = useIsTouchDevice();
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimReady(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={`overlay controls-tutorial-overlay${animReady ? ' controls-tutorial-overlay--ready' : ''}`}
      role="dialog"
      aria-label="How to steer"
    >
      <div className="controls-tutorial-card">
        {isTouch ? <MobileTutorialHints /> : <DesktopTutorialHints />}

        {isTouch ? (
          <>
            <p className="controls-tutorial-lead">Tilt or drag to steer</p>
            <p className="controls-tutorial-sub">Drag from center to control speed</p>
          </>
        ) : (
          <>
            <p className="controls-tutorial-lead">Drag your mouse to steer</p>
            <p className="controls-tutorial-sub">Farther from center = stronger turn</p>
          </>
        )}

        <button type="button" className="controls-tutorial-btn" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
