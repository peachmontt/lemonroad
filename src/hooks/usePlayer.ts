import { useCallback, useEffect, useState } from 'react';
import { clearPendingReferral, getPendingReferral } from '../game/referrals';
import { applyServerReferralStats } from '../game/progression';
import {
  attributeReferral,
  createSession,
  fetchReferrals,
  fetchRuns,
  updateProfile,
  type PlayerResponse,
  type ReferralStats,
  type RunRecord,
} from '../lib/api';

export function usePlayer() {
  const [player, setPlayer] = useState<PlayerResponse | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralBackendReady, setReferralBackendReady] = useState(false);

  const syncReferrals = useCallback(async () => {
    try {
      const pending = getPendingReferral();
      if (pending) {
        await attributeReferral(pending);
        clearPendingReferral();
      }
      const stats = await fetchReferrals();
      applyServerReferralStats(stats);
      setReferralStats(stats);
      setReferralBackendReady(true);
      return stats;
    } catch {
      setReferralBackendReady(false);
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const session = await createSession();
      setPlayer(session);
      const { runs: history } = await fetchRuns();
      setRuns(history);
      await syncReferrals();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load player');
    } finally {
      setLoading(false);
    }
  }, [syncReferrals]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setDisplayName = useCallback(
    async (displayName: string, walletPubkey?: string) => {
      if (!player) {
        await refresh();
      }
      const updated = await updateProfile({ displayName, walletPubkey });
      setPlayer(updated);
      return updated;
    },
    [player, refresh],
  );

  const linkWallet = useCallback(
    async (walletPubkey: string) => {
      const displayName = player?.displayName ?? 'Anonymous Lemon';
      const updated = await updateProfile({ displayName, walletPubkey });
      setPlayer(updated);
      return updated;
    },
    [player],
  );

  const reloadRuns = useCallback(async () => {
    const { runs: history } = await fetchRuns();
    setRuns(history);
    await syncReferrals();
  }, [syncReferrals]);

  return {
    player,
    runs,
    loading,
    error,
    referralStats,
    referralBackendReady,
    refresh,
    syncReferrals,
    setDisplayName,
    linkWallet,
    reloadRuns,
  };
}
