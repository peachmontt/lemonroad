import type { VercelRequest, VercelResponse } from '@vercel/node';

export type ApiHandler = (
  req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<any> | void;

export type GameMode = 'free' | 'paid';

export interface PlayerDto {
  id: string;
  displayName: string;
  walletPubkey: string | null;
}

export interface RunDto {
  id: string;
  mode: GameMode;
  distance: number;
  juiceLevel: string;
  citricVelocity: number;
  durationMs: number;
  diedAt: string;
  hourBucket: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  walletPubkey: string;
  displayName: string;
  distance: number;
  diedAt: string;
}
