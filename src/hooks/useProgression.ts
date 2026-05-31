import { useCallback, useState } from 'react';
import {
  completeMissionById,
  getProgress,
  incrementReferralCountDev,
  selectBadge,
  selectDeathTitle,
  selectSkin,
  type PlayerProgress,
  type UnlockNotification,
} from '../game/progression';
import type { BadgeId, DeathTitleId } from '../game/badges';
import type { SkinId } from '../game/skins';

export function useProgression() {
  const [progress, setProgress] = useState<PlayerProgress>(() => getProgress());
  const [recentUnlocks, setRecentUnlocks] = useState<UnlockNotification[]>([]);

  const refresh = useCallback(() => {
    setProgress(getProgress());
  }, []);

  const handleSelectSkin = useCallback((id: SkinId) => {
    const next = selectSkin(id);
    setProgress(next);
    return next;
  }, []);

  const handleSelectBadge = useCallback((id: BadgeId | null) => {
    const next = selectBadge(id);
    setProgress(next);
    return next;
  }, []);

  const handleSelectDeathTitle = useCallback(
    (id: DeathTitleId | null) => {
      const next = selectDeathTitle(id);
      setProgress(next);
      return next;
    },
    [],
  );

  const handleClaimMission = useCallback(
    (missionId: string) => {
      const { progress: next } = completeMissionById(missionId);
      setProgress(next);
    },
    [],
  );

  const handleSimulateReferral = useCallback(() => {
    setProgress(incrementReferralCountDev());
  }, []);

  return {
    progress,
    recentUnlocks,
    setRecentUnlocks,
    refresh,
    selectSkin: handleSelectSkin,
    selectBadge: handleSelectBadge,
    selectDeathTitle: handleSelectDeathTitle,
    claimMission: handleClaimMission,
    simulateReferral: handleSimulateReferral,
  };
}
