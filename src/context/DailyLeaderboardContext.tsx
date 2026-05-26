import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchDailyLeaderboard, type DailyLeaderboardResponse } from '../lib/api';
import type { DailyLeaderboardEntry } from '../lib/dailyRankLogic';

interface DailyLeaderboardContextValue {
  today: DailyLeaderboardResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  entries: DailyLeaderboardEntry[];
}

const DailyLeaderboardContext = createContext<DailyLeaderboardContextValue | null>(
  null,
);

export function DailyLeaderboardProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState<DailyLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailyLeaderboard('today');
      setToday(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = useMemo<DailyLeaderboardEntry[]>(
    () =>
      today?.entries.map((e) => ({
        playerId: e.playerId,
        bestDistance: e.bestDistance,
        position: e.position,
      })) ?? [],
    [today],
  );

  const value = useMemo(
    () => ({ today, loading, error, refresh: load, entries }),
    [today, loading, error, load, entries],
  );

  return (
    <DailyLeaderboardContext.Provider value={value}>
      {children}
    </DailyLeaderboardContext.Provider>
  );
}

export function useDailyLeaderboard(): DailyLeaderboardContextValue {
  const ctx = useContext(DailyLeaderboardContext);
  if (!ctx) {
    throw new Error('useDailyLeaderboard must be used within DailyLeaderboardProvider');
  }
  return ctx;
}
