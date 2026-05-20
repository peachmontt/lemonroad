import { track } from '@vercel/analytics';
import type { GameMode } from '../types/game';

/** Track when a game run starts */
export function trackGameStart(mode: GameMode) {
  track('game_start', { mode });
}

/** Track when a run ends (player died) */
export function trackRunEnd(opts: {
  mode: GameMode;
  distance: number;
  durationMs: number;
  juiceLevel: string;
}) {
  track('run_end', {
    mode: opts.mode,
    distance: Math.floor(opts.distance),
    durationSec: Math.round(opts.durationMs / 1000),
    juiceLevel: opts.juiceLevel,
  });
}

/** Track when a wallet connects */
export function trackWalletConnect(wallet: string) {
  track('wallet_connect', { wallet: wallet.slice(0, 8) });
}

/** Track when a 1 USDT deposit is confirmed */
export function trackPaidDeposit(opts: { hourBucket: string; walletPrefix: string }) {
  track('paid_deposit', { hourBucket: opts.hourBucket, wallet: opts.walletPrefix.slice(0, 8) });
}

/** Track when a paid run deposit is rejected / errors */
export function trackPaymentError(reason: string) {
  track('payment_error', { reason });
}
