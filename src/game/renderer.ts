import { COLORS, LEMON_RADIUS } from './constants';
import { getHazardLabel } from './hazards';
import { getSegmentAtY } from './road';
import type { GameState } from './types';

function jitter(amount = 2): number {
  return (Math.random() - 0.5) * amount * 2;
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height, flags } = state;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shake = reducedMotion ? 0 : flags.screenShake;

  ctx.save();
  if (shake > 0) {
    ctx.translate(jitter(shake), jitter(shake));
  }

  drawGrass(ctx, width, height);

  if (flags.greenTint > 0) {
    ctx.fillStyle = `rgba(0, 255, 0, ${0.08 * flags.greenTint})`;
    ctx.fillRect(0, 0, width, height);
  }

  drawSpeedLines(ctx, state);
  drawRoad(ctx, state);
  drawPuddles(ctx, state);
  drawHazards(ctx, state);
  drawTaxman(ctx, state);
  drawLemon(ctx, state);
  drawKnifeSlash(ctx, state);
  drawEventBanner(ctx, state);

  ctx.restore();
}

function drawGrass(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = COLORS.grassDark;
  const patches = Math.min(28, Math.floor(w / 24));
  for (let i = 0; i < patches; i++) {
    const x = (i * 97 + (stateTime() % 100)) % w;
    const y = (i * 53) % h;
    ctx.fillRect(x + jitter(1), y, 4, 8);
  }
}

let _t = 0;
function stateTime(): number {
  return _t;
}

export function setRenderTime(t: number): void {
  _t = t;
}

function drawRoad(ctx: CanvasRenderingContext2D, state: GameState): void {
  const segments = [...state.road].sort((a, b) => a.y - b.y);
  if (segments.length < 2) return;

  const now = state.time;
  const rugActive = now < state.flags.rugHoleUntil;

  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i];
    const b = segments[i + 1];
    if (!a.hasRoad || !b.hasRoad) continue;
    if (rugActive && i % 7 === 3) continue;

    const halfA = a.width / 2;
    const halfB = b.width / 2;

    ctx.beginPath();
    ctx.moveTo(a.centerX - halfA + jitter(), a.y + jitter());
    ctx.lineTo(b.centerX - halfB + jitter(), b.y + jitter());
    ctx.lineTo(b.centerX + halfB + jitter(), b.y + jitter());
    ctx.lineTo(a.centerX + halfA + jitter(), a.y + jitter());
    ctx.closePath();

    ctx.fillStyle = COLORS.road;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 4;
    ctx.stroke();

    if (i % 3 === 0) {
      const mx = (a.centerX + b.centerX) / 2 + jitter(0.5);
      const my = (a.y + b.y) / 2;
      ctx.fillStyle = COLORS.roadLine;
      ctx.fillRect(mx - 2, my - 3, 4, 6);
    }
  }

  for (const seg of segments) {
    if (!seg.hasRoad) {
      ctx.fillStyle = COLORS.void;
      ctx.fillRect(seg.centerX - seg.width, seg.y - 4, seg.width * 2, 12);
    }
  }
}

function drawPuddles(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.time >= state.flags.lemonadeUntil) return;
  const t = state.time;
  for (let i = 0; i < 5; i++) {
    const y =
      (state.lemonScreenY - 80 - i * 120 + (state.distance * 3) % state.height) %
      state.height;
    const seg = getSegmentAtY(state.road, y);
    const cx = seg?.centerX ?? state.width / 2;
    const x = cx + Math.sin(t + i * 2) * ((seg?.width ?? 200) * 0.2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - 40, y - 8, 80, 28);
    ctx.strokeStyle = COLORS.candleRed;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 30, y + 10);
    ctx.lineTo(x + 25, y - 12);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px "Comic Neue", Comic Sans MS, cursive';
    ctx.fillText('0 LP', x - 14, y + 6);
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 40, y - 8, 80, 28);
  }
}

function drawSpeedLines(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.phase !== 'playing' && state.phase !== 'idle') return;
  const speed = state.scrollSpeed * state.flags.scrollMultiplier;
  const count = Math.min(16, Math.floor(speed * 2));
  ctx.strokeStyle = 'rgba(255,255,220,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < count; i++) {
    const y = (i * 89 + state.time * speed * 40) % state.height;
    const seg = getSegmentAtY(state.road, y);
    if (!seg) continue;
    const half = seg.width * 0.35;
    const x =
      seg.centerX + (((i * 137 + state.time * 40) % (half * 200)) / 100 - 1) * half;
    const len = 8 + speed * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len);
    ctx.stroke();
  }
}

function drawHazards(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const h of state.hazards) {
    ctx.save();
    ctx.translate(h.x + jitter(1), h.y);
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.font = 'bold 9px "Comic Neue", Comic Sans MS, cursive';

    if (h.kind === 'short_squeeze') {
      const bw = 14;
      const gap = 6;
      for (let i = -2; i <= 2; i++) {
        const green = i % 2 === 0;
        ctx.fillStyle = green ? COLORS.candleGreen : COLORS.candleRed;
        const cx = i * (bw + gap);
        const bh = green ? 22 + i * 3 : 14;
        ctx.fillRect(cx - bw / 2, -bh / 2, bw, bh);
        ctx.strokeRect(cx - bw / 2, -bh / 2, bw, bh);
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(-28, 18, 56, 14);
      ctx.strokeRect(-28, 18, 56, 14);
      ctx.fillStyle = COLORS.outline;
      ctx.fillText('SQUEEZE', -22, 29);
    } else if (h.kind === 'monthly_inflation') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-26, -24, 52, 48);
      ctx.strokeRect(-26, -24, 52, 48);
      ctx.fillStyle = COLORS.cpiOrange;
      ctx.beginPath();
      ctx.moveTo(-18, 14);
      ctx.lineTo(-6, 0);
      ctx.lineTo(4, 8);
      ctx.lineTo(18, -16);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = COLORS.candleRed;
      ctx.font = 'bold 14px "Comic Neue", Comic Sans MS, cursive';
      ctx.fillText('CPI', -12, -8);
      ctx.font = 'bold 10px "Comic Neue", Comic Sans MS, cursive';
      ctx.fillText('+8.6%', -16, 6);
    } else {
      ctx.fillStyle = COLORS.fedNavy;
      ctx.fillRect(-36, -8, 72, 22);
      ctx.strokeRect(-36, -8, 72, 22);
      ctx.fillStyle = COLORS.fedBlue;
      ctx.fillRect(-28, -22, 56, 16);
      ctx.strokeRect(-28, -22, 56, 16);
      ctx.fillStyle = '#333';
      ctx.fillRect(-4, -30, 8, 10);
      ctx.fillStyle = '#fff';
      ctx.fillText('FED', -10, -10);
      ctx.fillStyle = '#111';
      ctx.fillRect(20, -18, 6, 14);
      ctx.fillStyle = '#888';
      ctx.fillRect(22, -26, 2, 10);
    }

    ctx.fillStyle = '#ffff00';
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    const lbl = getHazardLabel(h.kind);
    const tw = ctx.measureText(lbl).width;
    ctx.fillRect(-tw / 2 - 4, -h.h / 2 - 14, tw + 8, 12);
    ctx.strokeRect(-tw / 2 - 4, -h.h / 2 - 14, tw + 8, 12);
    ctx.fillStyle = COLORS.outline;
    ctx.fillText(lbl, -tw / 2, -h.h / 2 - 5);

    ctx.restore();
  }
}

function drawTaxman(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.taxman.active) return;
  const { x, y } = state.taxman;
  ctx.fillStyle = COLORS.suit;
  ctx.fillRect(x - 18 + jitter(), y - 50, 36, 50);
  ctx.fillStyle = '#FFCC99';
  ctx.beginPath();
  ctx.arc(x + jitter(), y - 58, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.tie;
  ctx.fillRect(x - 4, y - 45, 8, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px "Comic Neue", Comic Sans MS, cursive';
  ctx.fillText('SEC', x - 12, y - 65);
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 18, y - 50, 36, 50);
}

function drawLemon(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { lemon, lemonScreenY: ly } = state;
  const dancing = state.time < state.flags.dancingUntil;

  ctx.save();
  ctx.translate(lemon.x + jitter(dancing ? 3 : 1), ly + jitter(dancing ? 3 : 1));
  if (dancing) {
    ctx.translate(0, Math.sin(state.time * 12) * 15);
  }
  ctx.rotate(lemon.rotation + (state.phase === 'dying' ? lemon.spinSpeed * 10 : 0));
  const sq = lemon.squashX ?? 1;
  ctx.scale(lemon.scale * sq, lemon.scale / Math.max(0.5, sq));

  const r = LEMON_RADIUS;

  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.lemon;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = COLORS.lemonDark;
  ctx.beginPath();
  ctx.ellipse(-6, -4, 4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.outline;
  ctx.beginPath();
  ctx.arc(6, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-6, -4, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 8, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = '#228B22';
  ctx.beginPath();
  ctx.ellipse(0, -r - 4, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawKnifeSlash(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.time >= state.flags.knifeSlashUntil) return;
  ctx.save();
  const wx = state.width * 0.65;
  ctx.fillStyle = COLORS.whalePurple;
  ctx.beginPath();
  ctx.ellipse(wx, state.height * 0.25, 90, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px "Comic Neue", Comic Sans MS, cursive';
  ctx.fillText('WHALE', wx - 48, state.height * 0.28);
  ctx.fillStyle = COLORS.candleRed;
  ctx.fillRect(wx - 20, 0, 40, state.height * 0.35);
  ctx.strokeRect(wx - 20, 0, 40, state.height * 0.35);
  ctx.fillStyle = 'rgba(255,0,0,0.2)';
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.fillStyle = '#ff0';
  ctx.font = 'bold 36px "Comic Neue", Comic Sans MS, cursive';
  ctx.fillText('DUMP -40%', state.width * 0.15, 80);
  ctx.restore();
}

function drawEventBanner(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.activeEvent) return;
  ctx.save();
  ctx.fillStyle = '#FFFF00';
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 3;
  const text = state.activeEvent.label;
  ctx.font = 'bold 28px "Comic Neue", Comic Sans MS, cursive';
  const tw = ctx.measureText(text).width;
  const bx = state.width / 2 - tw / 2 - 16;
  ctx.fillRect(bx, 60, tw + 32, 44);
  ctx.strokeRect(bx, 60, tw + 32, 44);
  ctx.fillStyle = COLORS.outline;
  ctx.fillText(text, state.width / 2 - tw / 2, 92);
  if (state.activeEvent.id === 'bull_run') {
    ctx.font = 'bold 16px "Comic Neue", Comic Sans MS, cursive';
    ctx.fillText('>> NUMBER GO UP', state.width / 2 - 68, 115);
  }
  if (state.activeEvent.id === 'dancing') {
    ctx.font = 'bold 14px "Comic Neue", Comic Sans MS, cursive';
    ctx.fillText('WAGMI (probably)', state.width / 2 - 55, 115);
  }
  ctx.restore();
}

export function renderPausedPreview(ctx: CanvasRenderingContext2D, state: GameState): void {
  renderGame(ctx, state);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, state.width, state.height);
}
