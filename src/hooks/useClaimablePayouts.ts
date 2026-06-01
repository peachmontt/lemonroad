import { useCallback, useEffect, useState } from 'react';
import type { ClaimablePayout } from '../lib/api';
import { fetchClaimablePayouts } from '../lib/api';

export function useClaimablePayouts(enabled = true) {
  const [payouts, setPayouts] = useState<ClaimablePayout[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClaimablePayouts();
      setPayouts(data.payouts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rewards');
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    payouts,
    claimableCount: payouts.length,
    loading,
    error,
    reload,
    setError,
  };
}
