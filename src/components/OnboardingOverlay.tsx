import { useEffect } from 'react';

const ONBOARDING_KEY = 'lemonroad_controls_seen';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    /* ignore */
  }
}

interface OnboardingOverlayProps {
  onDismiss: () => void;
}

export function OnboardingOverlay({ onDismiss }: OnboardingOverlayProps) {
  const isMobile =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="overlay onboarding-overlay" role="dialog" aria-label="How to play">
      <button
        type="button"
        className="onboarding-card"
        onClick={onDismiss}
        aria-label="Start playing"
      >
        <p className="onboarding-lead">Drag left/right to survive.</p>
        <p>Avoid FED, CPI and whales.</p>
        <p>Last longer. Win daily rewards.</p>
        <p className="onboarding-controls">
          {isMobile ? 'Hold & drag to steer 🍋' : 'Move mouse or use A/D'}
        </p>
        <span className="onboarding-skip">Tap to start</span>
      </button>
    </div>
  );
}
