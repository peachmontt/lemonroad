import { LEMON_RADIUS } from './constants';
import type { GameState, Hazard } from './types';

export const NEAR_MISS_POINTS = 10;
export const COMBO_BONUS_POINTS = 25;
export const LEMON_HANDS_POINTS = 50;
export const MAX_BONUS_RATIO = 0.35;

export function getTotalScore(state: GameState): number {
  return state.distance + state.bonusScore;
}

export function capBonusScore(state: GameState): void {
  const maxBonus = Math.max(0, state.distance * MAX_BONUS_RATIO);
  if (state.bonusScore > maxBonus) {
    state.bonusScore = maxBonus;
  }
}

export function spawnFloatingText(
  state: GameState,
  text: string,
  x: number,
  y: number,
  color = '#FFE135',
): void {
  const clampedX = Math.max(40, Math.min(state.width - 40, x));
  state.floatingTexts.push({ text, x: clampedX, y, life: 1.2, color });
  if (state.floatingTexts.length > 8) {
    state.floatingTexts.shift();
  }
}

export function updateFloatingTexts(state: GameState, dt: number): void {
  for (const ft of state.floatingTexts) {
    ft.life -= dt;
    ft.y -= dt * 45;
  }
  state.floatingTexts = state.floatingTexts.filter((ft) => ft.life > 0);
}

export function registerNearMiss(state: GameState, lemonX: number, lemonY: number): void {
  state.dodgeStreak += 1;
  state.bonusScore += NEAR_MISS_POINTS;
  capBonusScore(state);
  spawnFloatingText(state, `+${NEAR_MISS_POINTS} NEAR MISS`, lemonX, lemonY - 30);

  if (state.dodgeStreak >= 3 && state.dodgeStreak % 3 === 0) {
    state.bonusScore += COMBO_BONUS_POINTS;
    capBonusScore(state);
    spawnFloatingText(
      state,
      `+${COMBO_BONUS_POINTS} DEGEN DODGE x${state.dodgeStreak}`,
      lemonX,
      lemonY - 55,
      '#FF6B00',
    );
  }
}

export function resetDodgeStreak(state: GameState): void {
  state.dodgeStreak = 0;
}

export function awardLemonHands(state: GameState, lemonX: number, lemonY: number): void {
  state.bonusScore += LEMON_HANDS_POINTS;
  capBonusScore(state);
  spawnFloatingText(
    state,
    `+${LEMON_HANDS_POINTS} LEMON HANDS`,
    lemonX,
    lemonY - 40,
    '#00E676',
  );
}

export function hazardOverlap(h: Hazard, lemonX: number, lemonY: number): boolean {
  return (
    Math.abs(h.x - lemonX) < h.w / 2 + LEMON_RADIUS - 8 &&
    Math.abs(h.y - lemonY) < h.h / 2 + LEMON_RADIUS - 4
  );
}

export function hazardNearZone(h: Hazard, lemonX: number, lemonY: number): boolean {
  return (
    Math.abs(h.x - lemonX) < h.w / 2 + LEMON_RADIUS + 28 &&
    Math.abs(h.y - lemonY) < h.h / 2 + LEMON_RADIUS + 40
  );
}
