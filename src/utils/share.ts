import { SITE_URL } from '../config/links';
import type { GameSnapshot } from '../game/types';

export function getPlayUrl(): string {
  if (SITE_URL) return SITE_URL;
  if (typeof window !== 'undefined') {
    const { origin, pathname } = window.location;
    const path = pathname === '/' ? '' : pathname.replace(/\/$/, '');
    return `${origin}${path}`;
  }
  return 'https://lemonroad.fun';
}

/** Short URL shown on the share image */
export function getDisplayUrl(): string {
  const full = getPlayUrl();
  try {
    const u = new URL(full);
    const host = u.host.replace(/^www\./, '');
    return host + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return full.replace(/^https?:\/\//, '');
  }
}

export function buildShareCaption(
  snapshot: GameSnapshot,
  juiceTitle: string,
  globalRank?: number,
): string {
  const m = Math.floor(snapshot.distance);
  const url = getPlayUrl();
  const rankLine = globalRank != null ? `\n(#${globalRank.toLocaleString()} juiced globally)` : '';
  return (
    `I got juiced at ${m}m on LEMON ROAD 🍋\n` +
    `Rank: ${juiceTitle}\n\n` +
    `No utility. No brakes. Only road.\n` +
    `Can you out-squeeze me?\n` +
    `👉 PLAY FREE: ${url}\n\n` +
    `#LEMONROAD #GotJuiced #crypto${rankLine}`
  );
}

export function openTwitterShare(caption: string, siteUrl: string): void {
  const dist = caption.match(/juiced at (\d+)m/)?.[1] ?? '??';
  const rank = caption.match(/Rank: (.+)/)?.[1] ?? 'Kitchen Accident';
  const tweet =
    `I got juiced at ${dist}m on LEMON ROAD 🍋\n` +
    `Rank: ${rank}\n` +
    `Can you out-squeeze me? 👉 ${siteUrl}\n` +
    `#LEMONROAD #GotJuiced #crypto`;
  const params = new URLSearchParams({ text: tweet });
  window.open(`https://twitter.com/intent/tweet?${params}`, '_blank', 'noopener,noreferrer');
}

/** Copy caption + link so user can paste into TikTok description or Reel caption */
export async function copyForTikTok(caption: string): Promise<void> {
  await copyCaption(caption);
  window.open('https://www.tiktok.com/upload', '_blank', 'noopener,noreferrer');
}

/** Copy caption + link so user can paste into Instagram caption */
export async function copyForInstagram(caption: string): Promise<void> {
  await copyCaption(caption);
  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
}

export function openTikTokUpload(): void {
  window.open('https://tiktok.com/upload', '_blank', 'noopener,noreferrer');
}

export function openInstagram(): void {
  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
}

export async function downloadPng(dataUrl: string, filename = 'lemon-road-play.png'): Promise<void> {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function copyCaption(caption: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(caption);
    return true;
  } catch {
    return false;
  }
}

export async function nativeShare(
  file: File,
  _caption: string,
  siteUrl: string,
): Promise<boolean> {
  if (!navigator.share) return false;
  const payload = {
    title: 'LEMON ROAD — play free',
    text: `Can you beat my run? Play here: ${siteUrl}`,
    files: [file],
  };
  if (navigator.canShare && !navigator.canShare(payload)) return false;
  try {
    await navigator.share(payload);
    return true;
  } catch {
    return false;
  }
}

// alias for ShareMenu
export const getSiteUrl = getPlayUrl;
