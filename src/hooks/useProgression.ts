import { useCallback, useState } from 'react';
import {
  completeMissionById,
  getProgress,
  incrementReferralCountDev,
  selectDeathTitle,
  selectSkin,
  type PlayerProgress,
  type UnlockNotification,
} from '../game/progression';
import type { DeathTitleId } from '../game/badges';
import type { SkinId } from '../game/skins';

export function useProgression() {
  const [progress, setProgress] = useState<PlayerProgress>(() => getProgress());
  const [recentUnlocks, setRecentUnlocks] = useState<UnlockNotification[]>([]);

  const refresh = useCallback(() => {
    setProgress(getProgress());
  }, []);

  const handleSelectSkin = useCallback(
    (id: SkinId) => {
      setProgress(selectSkin(id));
    },
    [],
  );

  const handleSelectDeathTitle = useCallback(
    (id: DeathTitleId | null) => {
      setProgress(selectDeathTitle(id));
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
    selectDeathTitle: handleSelectDeathTitle,
    claimMission: handleClaimMission,
    simulateReferral: handleSimulateReferral,
  };
}
