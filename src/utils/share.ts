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

export function buildShareCaption(snapshot: GameSnapshot, rank: number): string {
  const m = Math.floor(snapshot.distance);
  const url = getPlayUrl();
  return (
    `I only survived ${m}m before the SEC caught me on LEMON ROAD 🍋\n\n` +
    `Can you stay on the road longer?\n` +
    `👉 PLAY FREE: ${url}\n\n` +
    `No utility. Only road. #LEMONROAD #GotJuiced #crypto\n` +
    `(global rank #${rank.toLocaleString()} juiced)`
  );
}

export function openTwitterShare(caption: string, siteUrl: string): void {
  // X has a 280-char limit; use a short focused tweet with the link
  const tweet =
    `I only survived ${caption.match(/survived (\d+m)/)?.[1] ?? '??'} on LEMON ROAD 🍋\n` +
    `Can you beat me? Play free 👉 ${siteUrl}\n` +
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
