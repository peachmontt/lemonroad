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
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return data;
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

export interface LeaderboardResponse {
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

export function fetchLeaderboard(hour?: string) {
  const q = hour ? `?hour=${hour}` : '';
  return apiFetch<LeaderboardResponse>(`/api/leaderboard${q}`);
}

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
