/** Set your live URL here when deployed, or use VITE_SITE_URL in .env */
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';

export const BUY_URL = '#';
export const CHART_URL = '#';
export const X_URL = '#';
