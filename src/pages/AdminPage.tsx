import { useCallback, useEffect, useState, useRef } from 'react';
import { solanaExplorerTxUrl } from '../config/explorer';

interface PoolStats {
  currentDay: string;
  currentDayPool: {
    participants: number;
    deposited: string;
    rolloverIn: string;
    total: string;
    totalFormatted: string;
  };
  unsettledPools: {
    hourStart: string;
    participants: number;
    deposited: string;
    rolloverIn: string;
  }[];
  recentPaidRuns: {
    id: string;
    playerName: string;
    walletPubkey: string | null;
    distance: number;
    juiceLevel: string;
    diedAt: string;
    hourBucket: string | null;
  }[];
  totals: { players: number; runs: number };
  serverTime: string;
}

interface SettleResult {
  hour: string;
  participants: number;
  poolTotal: string;
  payouts: { place: number; wallet: string; amount: string; amountFormatted: string }[];
  rolloverOut: string;
  settleTx: string | null;
}

interface DailyRewardRow {
  id: string;
  date: string;
  position: number;
  rewardAmount: string;
  rewardCurrency: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  txHash: string | null;
  createdAt: string;
  player: {
    id: string;
    displayName: string;
    walletPubkey: string | null;
  };
}

const STATUS_LABELS: Record<DailyRewardRow['status'], string> = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  REJECTED: 'REJECTED',
};

const STATUS_COLORS: Record<DailyRewardRow['status'], string> = {
  PENDING: '#f5c518',
  PAID: '#4caf50',
  REJECTED: '#e53935',
};

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const secret = sessionStorage.getItem('lr_admin_secret') ?? '';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}`, ...options?.headers },
  });
  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `${res.status}`);
  return data;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function AdminPage() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('lr_admin_secret'));
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);

  // Daily rewards state
  const [rewardsDate, setRewardsDate] = useState(yesterdayUTC);
  const [rewards, setRewards] = useState<DailyRewardRow[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [txHashInputs, setTxHashInputs] = useState<Record<string, string>>({});
  const confirmRef = useRef<(msg: string) => boolean>(window.confirm.bind(window));

  const loadRewards = useCallback(async (date: string) => {
    setRewardsLoading(true);
    setRewardsError(null);
    try {
      const data = await apiFetch<{ rewards: DailyRewardRow[] }>(`/api/admin/rewards?date=${date}`);
      setRewards(data.rewards);
    } catch (e) {
      setRewardsError(e instanceof Error ? e.message : 'Failed to load rewards');
    } finally {
      setRewardsLoading(false);
    }
  }, []);

  const updateRewardStatus = async (id: string, status: 'PAID' | 'REJECTED') => {
    const row = rewards.find((r) => r.id === id);
    const label = status === 'PAID'
      ? `Mark reward for ${row?.player.displayName} (#${row?.position}) as PAID?`
      : `Reject reward for ${row?.player.displayName} (#${row?.position})?`;
    if (!confirmRef.current(label)) return;

    setActioning(id);
    try {
      const txHash = status === 'PAID' ? (txHashInputs[id] || undefined) : undefined;
      const updated = await apiFetch<DailyRewardRow>('/api/admin/rewards', {
        method: 'PATCH',
        body: JSON.stringify({ id, status, txHash }),
      });
      setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch (e) {
      setRewardsError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActioning(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PoolStats>('/api/admin/stats');
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
      if ((e as Error).message.includes('401') || (e as Error).message === 'Unauthorized') {
        sessionStorage.removeItem('lr_admin_secret');
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('lr_admin_secret', password);
    setAuthed(true);
  };

  const triggerSettle = async (hourBucket: string) => {
    setSettling(hourBucket);
    setSettleResult(null);
    try {
      const result = await apiFetch<SettleResult>('/api/admin/settle', {
        method: 'POST',
        body: JSON.stringify({ hourBucket }),
      });
      setSettleResult(result);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Settle failed');
    } finally {
      setSettling(null);
    }
  };

  useEffect(() => {
    if (authed) {
      void load();
      void loadRewards(rewardsDate);
    }
  }, [authed, load, loadRewards, rewardsDate]);

  if (!authed) {
    return (
      <div className="admin-login">
        <h1>Admin Login</h1>
        <form onSubmit={login}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ADMIN_SECRET"
            className="profile-input"
          />
          <button type="submit" className="btn btn-primary">ENTER</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>LEMON ROAD ADMIN</h1>
        <div className="admin-header-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => { sessionStorage.removeItem('lr_admin_secret'); setAuthed(false); }}
          >
            logout
          </button>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {stats && (
        <>
          <section className="admin-section">
            <h2>Totals</h2>
            <div className="admin-kpis">
              <div className="admin-kpi"><span>{stats.totals.players}</span>players</div>
              <div className="admin-kpi"><span>{stats.totals.runs}</span>total runs</div>
              <div className="admin-kpi"><span>{stats.currentDayPool.totalFormatted}</span>current day pool</div>
              <div className="admin-kpi"><span>{stats.currentDayPool.participants}</span>today's players</div>
            </div>
          </section>

          <section className="admin-section">
            <h2>Unsettled Pools ({stats.unsettledPools.length})</h2>
            {stats.unsettledPools.length === 0 ? (
              <p className="admin-empty">All pools settled.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Hour (UTC)</th>
                    <th>Players</th>
                    <th>Deposited (µUSDT)</th>
                    <th>Rollover in</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.unsettledPools.map((p) => {
                    const bucket = String(Math.floor(new Date(p.hourStart).getTime() / 3_600_000));
                    return (
                      <tr key={p.hourStart}>
                        <td>{new Date(p.hourStart).toISOString().slice(0, 16)}</td>
                        <td>{p.participants}</td>
                        <td>{p.deposited}</td>
                        <td>{p.rolloverIn}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => void triggerSettle(bucket)}
                            disabled={settling === bucket}
                          >
                            {settling === bucket ? 'Settling...' : 'Settle'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {settleResult && (
            <section className="admin-section admin-settle-result">
              <h2>Last Settle Result — Hour {settleResult.hour}</h2>
              <p>Players: {settleResult.participants} | Pool: {settleResult.poolTotal} µUSDT | Rollover: {settleResult.rolloverOut} µUSDT</p>
              {settleResult.settleTx && (
                <p>TX: <a href={solanaExplorerTxUrl(settleResult.settleTx)} target="_blank" rel="noreferrer">{settleResult.settleTx.slice(0, 16)}…</a></p>
              )}
              <ul>
                {settleResult.payouts.map((p) => (
                  <li key={p.place}>#{p.place}: {p.wallet.slice(0, 8)}… — {p.amountFormatted}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="admin-section">
            <div className="admin-section-header">
              <h2>Daily Rewards</h2>
              <div className="admin-section-controls">
                <input
                  type="date"
                  value={rewardsDate}
                  max={todayUTC()}
                  onChange={(e) => {
                    setRewardsDate(e.target.value);
                    void loadRewards(e.target.value);
                  }}
                  className="admin-date-input"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void loadRewards(rewardsDate)}
                  disabled={rewardsLoading}
                >
                  {rewardsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
            {rewardsError && <p className="admin-error">{rewardsError}</p>}
            {rewards.length === 0 && !rewardsLoading ? (
              <p className="admin-empty">No rewards for {rewardsDate}.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Wallet</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>TX Hash (for paid)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.position}</td>
                      <td>{r.player.displayName}</td>
                      <td>
                        {r.player.walletPubkey
                          ? (
                            <span
                              title={r.player.walletPubkey}
                              style={{ cursor: 'pointer' }}
                              onClick={() => void navigator.clipboard.writeText(r.player.walletPubkey!)}
                            >
                              {r.player.walletPubkey.slice(0, 6)}…{r.player.walletPubkey.slice(-4)}
                            </span>
                          )
                          : <span style={{ opacity: 0.4 }}>no wallet</span>
                        }
                      </td>
                      <td>{r.rewardAmount} {r.rewardCurrency}</td>
                      <td>
                        <span
                          className="admin-status-badge"
                          style={{ color: STATUS_COLORS[r.status] }}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td>
                        {r.status === 'PENDING' ? (
                          <input
                            type="text"
                            placeholder="tx signature (optional)"
                            value={txHashInputs[r.id] ?? ''}
                            onChange={(e) =>
                              setTxHashInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            className="admin-tx-input"
                            disabled={actioning === r.id}
                          />
                        ) : (
                          r.txHash
                            ? <span title={r.txHash}>{r.txHash.slice(0, 8)}…</span>
                            : <span style={{ opacity: 0.4 }}>—</span>
                        )}
                      </td>
                      <td className="admin-reward-actions">
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => void updateRewardStatus(r.id, 'PAID')}
                              disabled={actioning === r.id}
                            >
                              {actioning === r.id ? '…' : 'Mark Paid'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => void updateRewardStatus(r.id, 'REJECTED')}
                              disabled={actioning === r.id}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status !== 'PENDING' && (
                          <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="admin-section">
            <h2>Recent Paid Runs (last 20)</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Wallet</th>
                  <th>Distance</th>
                  <th>Juice</th>
                  <th>Hour</th>
                  <th>Died at</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPaidRuns.map((r) => (
                  <tr key={r.id}>
                    <td>{r.playerName}</td>
                    <td>{r.walletPubkey ? `${r.walletPubkey.slice(0, 6)}…` : '—'}</td>
                    <td>{Math.floor(r.distance)}m</td>
                    <td>{r.juiceLevel}</td>
                    <td>{r.hourBucket ?? '—'}</td>
                    <td>{new Date(r.diedAt).toISOString().slice(11, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="admin-footer">Server: {stats.serverTime}</p>
        </>
      )}
    </div>
  );
}
