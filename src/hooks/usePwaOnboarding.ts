import { useCallback, useEffect, useRef, useState } from 'react';
import { supportsNotifications, getNotificationPermission } from '../lib/pwa/platform';
import {
  dismissInstallNudge,
  dismissNotificationNudge,
  isInstallNudgeCoolingDown,
  isNotificationNudgeCoolingDown,
} from '../lib/pwa/preferences';
import { usePwaInstall } from './usePwaInstall';

export type EngagementTrigger = 'gameOver' | 'walletSaved' | 'rewardBannerClick' | 'timer';

export interface UsePwaOnboardingReturn {
  showInstallNudge: boolean;
  showNotificationNudge: boolean;
  onEngagement: (trigger: EngagementTrigger) => void;
  dismissInstall: () => void;
  dismissNotification: () => void;
}

export function usePwaOnboarding(): UsePwaOnboardingReturn {
  const { installStatus, isStandaloneMode, isInApp } = usePwaInstall();

  const [engagementFired, setEngagementFired] = useState(false);
  const [showInstallNudge, setShowInstallNudge] = useState(false);
  const [showNotificationNudge, setShowNotificationNudge] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: wire 25-second timer as one engagement path
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      fireEngagement('timer');
    }, 25_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fireEngagement = useCallback((_trigger: EngagementTrigger) => {
    setEngagementFired(true);

    const standalone = isStandaloneMode;
    const alreadyInstalled = installStatus === 'installed' || standalone;
    const notifPermission = getNotificationPermission();

    if (!standalone && !alreadyInstalled && !isInstallNudgeCoolingDown() && !isInApp) {
      // iOS in-app browser or non-Safari: skip install nudge (shown in InAppBrowserNotice)
      setShowInstallNudge(true);
    }

    // Standalone mode: skip install nudge, show notification nudge
    if (standalone && supportsNotifications() && notifPermission === 'default' && !isNotificationNudgeCoolingDown()) {
      setShowNotificationNudge(true);
    }

    // After game-over/wallet trigger in non-standalone: also queue notification nudge behind install
    if (!standalone && alreadyInstalled && supportsNotifications() && notifPermission === 'default' && !isNotificationNudgeCoolingDown()) {
      setShowNotificationNudge(true);
    }
  }, [installStatus, isStandaloneMode, isInApp]);

  const onEngagement = useCallback((trigger: EngagementTrigger) => {
    if (!engagementFired) {
      fireEngagement(trigger);
    }
  }, [engagementFired, fireEngagement]);

  const dismissInstall = useCallback(() => {
    dismissInstallNudge();
    setShowInstallNudge(false);
  }, []);

  const dismissNotification = useCallback(() => {
    dismissNotificationNudge();
    setShowNotificationNudge(false);
  }, []);

  // After install, swap install nudge for notification nudge
  useEffect(() => {
    if (installStatus === 'installed') {
      setShowInstallNudge(false);
      const notifPermission = getNotificationPermission();
      if (supportsNotifications() && notifPermission === 'default' && !isNotificationNudgeCoolingDown()) {
        setShowNotificationNudge(true);
      }
    }
  }, [installStatus]);

  return {
    showInstallNudge,
    showNotificationNudge,
    onEngagement,
    dismissInstall,
    dismissNotification,
  };
}
