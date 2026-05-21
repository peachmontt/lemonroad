import type { IncomingMessage } from 'http';

/** Maximum plausible distance (units) per millisecond. Calibrate to real game physics. */
const MAX_VELOCITY = 0.5; // distance units per ms

/** Minimum play duration to count as a valid run. */
const MIN_DURATION_MS = 3_000;

export interface AntiCheatInput {
  distance: number;
  durationMs: number;
  citricVelocity: number;
}

export interface AntiCheatResult {
  isValid: boolean;
  antiCheatScore: number;
  reasons: string[];
}

/** Score and validate a single run submission. Higher score = more suspicious. */
export function scoreRun(input: AntiCheatInput): AntiCheatResult {
  const { distance, durationMs, citricVelocity } = input;
  let score = 0;
  const reasons: string[] = [];

  if (durationMs < MIN_DURATION_MS) {
    score += 100;
    reasons.push(`duration_too_short:${durationMs}ms`);
  }

  if (durationMs > 0 && distance / durationMs > MAX_VELOCITY) {
    score += 80;
    reasons.push(`impossible_velocity:${(distance / durationMs).toFixed(4)}`);
  }

  // citricVelocity reported by client — cross-check plausibility
  if (citricVelocity > MAX_VELOCITY * 1_000) {
    score += 40;
    reasons.push(`high_citric_velocity:${citricVelocity}`);
  }

  return {
    isValid: score < 100,
    antiCheatScore: score,
    reasons,
  };
}

/** Extract a normalised device type string from the User-Agent header. */
export function parseDeviceType(req: IncomingMessage): string {
  const ua = (req.headers['user-agent'] ?? '').toLowerCase();
  if (/mobile|android|iphone|ipad/.test(ua)) return 'mobile';
  if (/tablet/.test(ua)) return 'tablet';
  return 'desktop';
}
