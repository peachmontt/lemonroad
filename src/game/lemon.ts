import type { GameFlags, LemonState } from './types';

const ACCEL = 1.6;
const FRICTION_NORMAL = 0.88;
const FRICTION_SLIP = 0.95;
const INPUT_LAG = 0.22;

export function createLemon(x: number): LemonState {
  return {
    x,
    vx: 0,
    rotation: 0,
    spinSpeed: 0,
    scale: 1,
    squashX: 1,
  };
}

export function updateLemon(
  lemon: LemonState,
  inputSmoothed: number,
  dt: number,
  time: number,
  flags: GameFlags,
  canvasWidth: number,
  squash: { amount: number; vel: number },
): { amount: number; vel: number } {
  const friction = flags.slippery ? FRICTION_SLIP : FRICTION_NORMAL;
  const inputMult = flags.slippery ? 1.5 : 1;

  lemon.vx += inputSmoothed * ACCEL * inputMult * dt * 60;
  lemon.x += lemon.vx * dt * 60;
  lemon.vx *= Math.pow(friction, dt * 60);

  lemon.x += Math.sin(time * 0.004) * 0.8 * dt * 60;

  const margin = 36;
  if (lemon.x < margin) {
    lemon.x = margin;
    lemon.vx *= -0.4;
  }
  if (lemon.x > canvasWidth - margin) {
    lemon.x = canvasWidth - margin;
    lemon.vx *= -0.4;
  }

  lemon.rotation = lemon.vx * 0.12 + Math.sin(time * 0.025) * 0.35;

  // squash spring back after hazard hit
  let { amount, vel } = squash;
  if (amount < 1) {
    vel += 0.35 * dt * 60;
    amount += vel * dt;
    if (amount > 1) {
      amount = 1;
      vel = 0;
    }
  }
  lemon.squashX = amount;

  return { amount, vel };
}

export function smoothInput(current: number, target: number, dt: number): number {
  const factor = 1 - Math.pow(1 - INPUT_LAG, dt * 60);
  return current + (target - current) * factor;
}

export function updateDyingLemon(lemon: LemonState, dt: number): void {
  lemon.spinSpeed = 0.4;
  lemon.rotation += lemon.spinSpeed * dt * 60;
  lemon.scale = 1 + Math.sin(Date.now() * 0.02) * 0.15;
  lemon.squashX = 1;
  lemon.vx *= 0.98;
  lemon.x += lemon.vx * dt * 60;
}
