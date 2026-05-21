import { useCallback, useEffect, useState } from 'react';
import {
  createSession,
  fetchRuns,
  updateProfile,
  type PlayerResponse,
  type RunRecord,
} from '../lib/api';

export function usePlayer() {
  const [player, setPlayer] = useState<PlayerResponse | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const session = await createSession();
      setPlayer(session);
      const { runs: history } = await fetchRuns();
      setRuns(history);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load player');
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, []);

  return {
    player,
    runs,
    loading,
    error,
    refresh,
    setDisplayName,
    linkWallet,
    reloadRuns,
  };
}
