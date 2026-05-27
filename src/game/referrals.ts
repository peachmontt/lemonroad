import { SITE_URL } from '../config/links';

const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return `LEMON-${suffix}`;
}

export function getReferralShareUrl(code: string): string {
  const base = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/?ref=${encodeURIComponent(code)}`;
}

export function parseReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const ref = new URLSearchParams(window.location.search).get('ref');
  return ref?.trim() || null;
}

const PENDING_REF_KEY = 'lemonroad_pending_ref';

export function storePendingReferral(ref: string): void {
  try {
    localStorage.setItem(PENDING_REF_KEY, ref);
  } catch {
    /* ignore */
  }
}

export function getPendingReferral(): string | null {
  try {
    return localStorage.getItem(PENDING_REF_KEY);
  } catch {
    return null;
  }
}

export function clearPendingReferral(): void {
  try {
    localStorage.removeItem(PENDING_REF_KEY);
  } catch {
    /* ignore */
  }
}

export interface ReferralReward {
  friends: number;
  label: string;
}

export const REFERRAL_REWARDS: ReferralReward[] = [
  { friends: 3, label: 'Golden Lemon skin' },
  { friends: 5, label: 'Custom death phrase slot' },
  { friends: 10, label: 'Special leaderboard badge' },
];

export function simulateReferralDevOnly(currentCount: number): number {
  if (!import.meta.env.DEV) return currentCount;
  return currentCount + 1;
}
