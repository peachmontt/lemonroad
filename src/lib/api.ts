const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const text = await res.text();
  let data: (T & { error?: string }) | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T & { error?: string };
    } catch {
      if (!res.ok) throw new Error(text);
      throw new Error('Invalid JSON response');
    }
  }
  if (!res.ok) {
    throw new Error(data?.error ?? (text || `Request failed: ${res.status}`));
  }
  return (data ?? {}) as T;
}

export interface PlayerResponse {
  playerId: string;
  displayName: string;
  walletPubkey: string | null;
}

export interface RunRecord {
  id: string;
  mode: 'free' | 'paid';
  distance: number;
  juiceLevel: string;
  citricVelocity: number;
  durationMs: number;
  diedAt: string;
  hourBucket: string | null;
}

export interface PoolLeaderboardResponse {
  scope: 'pool';
  hour: string;
  hourLabel: string;
  participants: number;
  poolTotal: string;
  poolTotalFormatted: string;
  entries: {
    rank: number;
    walletPubkey: string;
    displayName: string;
    distance: number;
    diedAt: string;
  }[];
  projectedPayouts: {
    place: number;
    walletPubkey: string;
    amount: string;
    amountFormatted: string;
  }[];
  projectedRollover: string;
  previousHour: string;
}

export interface GlobalLeaderboardResponse {
  scope: 'global';
  mode: 'free' | 'paid' | 'all';
  entries: {
    rank: number;
    displayName: string;
    distance: number;
    mode: 'free' | 'paid';
    diedAt: string;
  }[];
}

/** @deprecated Use PoolLeaderboardResponse */
export type LeaderboardResponse = PoolLeaderboardResponse;

export function createSession() {
  return apiFetch<PlayerResponse>('/api/session', { method: 'POST' });
}

export function updateProfile(body: {
  displayName: string;
  walletPubkey?: string;
}) {
  return apiFetch<PlayerResponse>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchRuns(limit = 50) {
  return apiFetch<{ runs: RunRecord[] }>(`/api/runs?limit=${limit}`);
}

export function submitRun(body: {
  mode: 'free' | 'paid';
  distance: number;
  juiceLevel: string;
  citricVelocity: number;
  durationMs: number;
  depositTx?: string;
  walletPubkey?: string;
  paymentChain?: 'solana' | 'evm';
}) {
  return apiFetch<{ id: string }>('/api/runs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchPoolLeaderboard(hour?: string) {
  const q = hour ? `?hour=${hour}` : '';
  return apiFetch<PoolLeaderboardResponse>(`/api/leaderboard${q}`);
}

export function fetchGlobalLeaderboard(
  mode: 'free' | 'paid' | 'all' = 'free',
  limit = 50,
) {
  const params = new URLSearchParams({ scope: 'global', mode, limit: String(limit) });
  return apiFetch<GlobalLeaderboardResponse>(`/api/leaderboard?${params}`);
}

/** @deprecated Use fetchPoolLeaderboard */
export const fetchLeaderboard = fetchPoolLeaderboard;

export function preparePaidAttempt(
  walletPubkey: string,
  paymentChain: 'solana' | 'evm' = 'solana',
) {
  return apiFetch<{
    ready: boolean;
    depositTx?: string;
    hourBucket: string;
    amountUsdt: string;
    amountFormatted?: string;
    accounts?: Record<string, string>;
  }>('/api/paid/prepare', {
    method: 'POST',
    body: JSON.stringify({ walletPubkey, paymentChain }),
  });
}
