import { COLORS, isNarrowScreen } from './constants';
import type { GameState } from './types';

const FIELD_SPACING = 88;
const DUST_SPACING = 64;
const SIGN_SPACING = 1200;

const ROADSIDE_SIGNS = ['NO BRAKES', 'JUICE ZONE', 'SQUEEZE', 'ROAD TAX'] as const;

export function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fixed X in left/right grass strips — keyed only by slot index, never by road Y.
 * Avoids horizontal flash when the road center weaves each frame.
 */
function stableGrassX(canvasWidth: number, side: 0 | 1, slotIndex: number): number {
  const h = hash(slotIndex + 77);
  const minInset = 22;
  const maxInset = Math.min(Math.max(minInset + 8, canvasWidth * 0.13), 100);
  const inset = minInset + h * (maxInset - minInset);
  return side === 0 ? inset : canvasWidth - inset;
}

function drawMiniLemon(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.lemon;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function forVisibleSlots(
  scrollY: number,
  height: number,
  spacing: number,
  cap: number,
): { i: number; worldY: number }[] {
  const firstI = Math.floor(scrollY / spacing) - 1;
  const lastI = Math.ceil((scrollY + height) / spacing) + 1;
  const slots: { i: number; worldY: number }[] = [];
  for (let i = firstI; i <= lastI && slots.length < cap; i++) {
    const worldY = i * spacing - scrollY;
    if (worldY < -50 || worldY > height + 50) continue;
    slots.push({ i, worldY });
  }
  return slots;
}

export function drawFieldDecorations(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (isNarrowScreen(state.width)) return;

  const { width, height, decorScrollY } = state;
  const rm = reducedMotion();
  const cap = rm ? 10 : 18;
  const slots = forVisibleSlots(decorScrollY, height, FIELD_SPACING, cap);

  for (const { i, worldY } of slots) {
    const h0 = hash(i);
    const h1 = hash(i + 17);
    const side = h0 < 0.5 ? 0 : 1;
    const x = stableGrassX(width, side as 0 | 1, i);
    const type = Math.floor(hash(i + 41) * 4);

    switch (type) {
      case 0:
        drawMiniLemon(ctx, x, worldY, 0.8 + h1 * 0.25);
        break;
      case 1: {
        ctx.beginPath();
        ctx.arc(x, worldY, 2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.grassDark;
        ctx.fill();
        break;
      }
      default: {
        ctx.fillStyle = 'rgba(90, 70, 40, 0.25)';
        ctx.fillRect(x - 2, worldY, 4, 3);
        break;
      }
    }
  }
}

export function drawSideDust(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (isNarrowScreen(state.width)) return;

  const { width, height, decorScrollY } = state;
  const cap = reducedMotion() ? 4 : 6;
  const slots = forVisibleSlots(decorScrollY, height, DUST_SPACING, cap);

  for (const { i, worldY } of slots) {
    const side = hash(i + 200) < 0.5 ? 0 : 1;
    const x = stableGrassX(width, side as 0 | 1, i + 900);
    ctx.fillStyle = 'rgba(90, 70, 40, 0.22)';
    ctx.fillRect(x - 1, worldY, 3, 2);
  }
}

export function drawRoadsideSigns(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (isNarrowScreen(state.width)) return;

  const { width, height, decorScrollY } = state;
  const cap = reducedMotion() ? 1 : 2;
  const slots = forVisibleSlots(decorScrollY, height, SIGN_SPACING, cap + 1);

  let drawn = 0;
  for (const { i, worldY } of slots) {
    if (drawn >= cap) break;
    const side = hash(i + 500) < 0.5 ? 0 : 1;
    const x = stableGrassX(width, side as 0 | 1, i + 1200);

    const text = ROADSIDE_SIGNS[i % ROADSIDE_SIGNS.length];
    const tw = Math.min(80, 10 + text.length * 5);
    const th = 18;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    ctx.fillRect(x - tw / 2, worldY - th - 8, tw, th);
    ctx.strokeRect(x - tw / 2, worldY - th - 8, tw, th);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 1, worldY - 8, 2, 10);
    ctx.font = 'bold 8px "Comic Neue", Comic Sans MS, cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(text, x, worldY - th / 2 - 8);
    ctx.restore();
    drawn++;
  }
}
