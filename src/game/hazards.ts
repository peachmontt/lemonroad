import { getLeadingRoadSegment, randomXOnRoad } from './road';
import {
  hazardNearZone,
  hazardOverlap,
  registerNearMiss,
  resetDodgeStreak,
} from './scoring';
import type { GameState, HazardKind } from './types';

const KINDS: HazardKind[] = ['short_squeeze', 'monthly_inflation', 'powell_speech'];

const HAZARD_META: Record<HazardKind, { w: number; h: number; label: string }> = {
  short_squeeze: { w: 76, h: 54, label: 'SHORT SQUEEZE' },
  monthly_inflation: { w: 58, h: 62, label: 'CPI +8.6%' },
  powell_speech: { w: 84, h: 50, label: 'POWELL SPEECH' },
};

let nextId = 1;

export function spawnHazard(state: GameState, forceKind?: HazardKind): void {
  const kind =
    forceKind ??
    KINDS[Math.floor(Math.random() * KINDS.length)];
  const meta = HAZARD_META[kind];
  const spawnY = getLeadingRoadSegment(state.road)?.y ?? 0;
  const x = randomXOnRoad(state.road, spawnY, state.width);

  state.hazards.push({
    id: nextId++,
    kind,
    x,
    y: -meta.h - 24,
    vy: 0,
    w: meta.w,
    h: meta.h,
    life: 1,
    passed: false,
  });
}

function applyHazardHit(state: GameState, kind: HazardKind): void {
  resetDodgeStreak(state);
  const lemon = state.lemon;
  const seg = getLeadingRoadSegment(state.road);
  const center = seg?.centerX ?? state.width / 2;

  switch (kind) {
    case 'short_squeeze': {
      const pull = (center - lemon.x) * 0.15;
      lemon.vx += pull + (Math.random() - 0.5) * 4;
      state.lemonSquash = 0.55;
      state.lemonSquashVel = -0.12;
      state.flags.screenShake = Math.max(state.flags.screenShake, 4);
      break;
    }
    case 'monthly_inflation': {
      lemon.vx += (Math.random() - 0.5) * (6 + state.difficulty * 2);
      state.flags.slippery = true;
      state.slipperyUntil = state.time + 2.0;
      state.lemonSquash = 0.7;
      state.lemonSquashVel = -0.06;
      break;
    }
    case 'powell_speech': {
      lemon.vx += (Math.random() > 0.5 ? 1 : -1) * (7 + state.difficulty * 1.5);
      lemon.x += lemon.vx * 0.08;
      state.lemonSquash = 0.55;
      state.lemonSquashVel = -0.10;
      state.flags.screenShake = Math.max(state.flags.screenShake, 5);
      state.flags.freezeUntil = Math.max(state.flags.freezeUntil, state.time + 0.08);
      break;
    }
  }
}

export function updateHazards(state: GameState, scrollDelta: number): void {
  const lemonY = state.lemonScreenY;
  const lemon = state.lemon;

  for (const h of state.hazards) {
    h.y += scrollDelta * 1.05 + h.vy;
    h.vy *= 0.9;

    if (hazardOverlap(h, lemon.x, lemonY) && h.life > 0) {
      h.life = -1;
      applyHazardHit(state, h.kind);
      state.lastHitKind = h.kind;
      continue;
    }

    if (!h.passed && h.y - h.h / 2 >= lemonY && h.life > 0) {
      h.passed = true;
      if (hazardNearZone(h, lemon.x, lemonY)) {
        registerNearMiss(state, lemon.x, lemonY);
      } else {
        resetDodgeStreak(state);
      }
    }
  }

  state.hazards = state.hazards.filter((h) => h.y < state.height + 120 && h.life > 0);
}

export function shouldSpawnHazard(state: GameState, now: number): boolean {
  if (state.phase !== 'playing') return false;
  if (state.flags.scrollPaused) return false;
  const interval = Math.max(3.0, 5.5 - state.difficulty * 0.8);
  if (now < state.nextHazardAt) return false;
  state.nextHazardAt = now + interval + Math.random() * 1.5;
  return true;
}

export function getHazardLabel(kind: HazardKind): string {
  return HAZARD_META[kind].label;
}
