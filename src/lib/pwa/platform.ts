/** Platform detection utilities for PWA install / notification flows. */

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
}

/** Returns true when the user is inside an in-app browser (Instagram, TikTok, Telegram, Facebook, etc.) */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Instagram|FBAN|FBAV|FB_IAB|Twitter|TikTok|Line|Telegram|Snapchat|WhatsApp/.test(ua);
}

export function supportsInstallPrompt(): boolean {
  return typeof window !== 'undefined' && 'BeforeInstallPromptEvent' in window;
}

export function supportsNotifications(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!supportsNotifications()) return 'unsupported';
  return Notification.permission;
}

/** Returns 'ios' | 'android' | 'other' */
export function getPlatform(): 'ios' | 'android' | 'other' {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'other';
}
