/** localStorage-backed preferences for PWA install and notification nudges. */

const INSTALL_DISMISSED_KEY = 'lemonroad_install_dismissed_at';
const NOTIF_DISMISSED_KEY = 'lemonroad_notifications_dismissed_at';
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

function getTimestamp(key: string): number | null {
  try {
    const val = localStorage.getItem(key);
    if (!val) return null;
    const ts = parseInt(val, 10);
    return isNaN(ts) ? null : ts;
  } catch {
    return null;
  }
}

function setTimestamp(key: string): void {
  try {
    localStorage.setItem(key, Date.now().toString());
  } catch {
    // localStorage may be unavailable in private mode
  }
}

function clearKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// ── Install nudge ─────────────────────────────────

export function dismissInstallNudge(): void {
  setTimestamp(INSTALL_DISMISSED_KEY);
}

export function clearInstallDismissal(): void {
  clearKey(INSTALL_DISMISSED_KEY);
}

export function isInstallNudgeCoolingDown(): boolean {
  const ts = getTimestamp(INSTALL_DISMISSED_KEY);
  if (ts === null) return false;
  return Date.now() - ts < COOLDOWN_MS;
}

// ── Notification nudge ────────────────────────────

export function dismissNotificationNudge(): void {
  setTimestamp(NOTIF_DISMISSED_KEY);
}

export function clearNotificationDismissal(): void {
  clearKey(NOTIF_DISMISSED_KEY);
}

export function isNotificationNudgeCoolingDown(): boolean {
  const ts = getTimestamp(NOTIF_DISMISSED_KEY);
  if (ts === null) return false;
  return Date.now() - ts < COOLDOWN_MS;
}
