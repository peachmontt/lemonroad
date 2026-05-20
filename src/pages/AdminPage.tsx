import { useCallback, useEffect, useState } from 'react';

interface PoolStats {
  currentHour: string;
  currentPool: {
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

export function AdminPage() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('lr_admin_secret'));
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);

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
    if (authed) void load();
  }, [authed, load]);

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
              <div className="admin-kpi"><span>{stats.currentPool.totalFormatted}</span>current hour pool</div>
              <div className="admin-kpi"><span>{stats.currentPool.participants}</span>current hour players</div>
            </div>
          </section>

          <section className="admin-section">
            <h2>Unsettled Hours ({stats.unsettledPools.length})</h2>
            {stats.unsettledPools.length === 0 ? (
              <p className="admin-empty">All hours settled.</p>
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
                <p>TX: <a href={`https://explorer.solana.com/tx/${settleResult.settleTx}?cluster=devnet`} target="_blank" rel="noreferrer">{settleResult.settleTx.slice(0, 16)}…</a></p>
              )}
              <ul>
                {settleResult.payouts.map((p) => (
                  <li key={p.place}>#{p.place}: {p.wallet.slice(0, 8)}… — {p.amountFormatted}</li>
                ))}
              </ul>
            </section>
          )}

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
