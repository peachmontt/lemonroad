import { COLORS, LEMON_RADIUS } from './constants';
import { getHazardLabel } from './hazards';
import { getSegmentAtY } from './road';
import type { GameState } from './types';

let _t = 0;
function stateTime(): number {
  return _t;
}

export function setRenderTime(t: number): void {
  _t = t;
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height, flags } = state;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shake = reducedMotion ? 0 : flags.screenShake;

  ctx.save();
  if (shake > 0) {
    const dx = (Math.random() - 0.5) * shake * 0.8;
    const dy = (Math.random() - 0.5) * shake * 0.8;
    ctx.translate(dx, dy);
  }

  drawGrass(ctx, width, height);

  if (flags.greenTint > 0) {
    ctx.fillStyle = `rgba(0, 255, 0, ${0.08 * flags.greenTint})`;
    ctx.fillRect(0, 0, width, height);
  }

  drawSpeedLines(ctx, state);
  drawRoad(ctx, state);
  drawRugPullFire(ctx, state);
  drawPuddles(ctx, state);
  drawHazards(ctx, state);
  drawTaxman(ctx, state);
  drawLemon(ctx, state);
  drawKnifeSlash(ctx, state);
  drawEventBanner(ctx, state);
  drawRugBurnIndicator(ctx, state);

  ctx.restore();
}

function drawGrass(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, w, h);
  // Smoothly scrolling dark patches — no random jitter so the colour is stable
  ctx.fillStyle = COLORS.grassDark;
  const patches = Math.min(32, Math.floor(w / 20));
  const scrollY = (stateTime() * 50) % h;
  for (let i = 0; i < patches; i++) {
    const x = (i * 97) % w;
    const y = ((i * 53) + scrollY) % h;
    ctx.fillRect(x, y, 5, 9);
    // wrap-around second copy so patches appear continuous at bottom edge
    if (y + 9 > h) ctx.fillRect(x, y - h, 5, 9);
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, state: GameState): void {
  const segs = [...state.road].sort((a, b) => a.y - b.y);
  if (segs.length < 2) return;

  // Collect contiguous runs of road segments and draw each as one smooth path
  let runStart = -1;
  for (let i = 0; i <= segs.length; i++) {
    const inRun = i < segs.length && segs[i].hasRoad;
    if (inRun && runStart < 0) {
      runStart = i;
    } else if (!inRun && runStart >= 0) {
      drawRoadRun(ctx, segs, runStart, i);
      runStart = -1;
    }
  }
}

function drawRoadRun(
  ctx: CanvasRenderingContext2D,
  segs: { centerX: number; y: number; width: number; hasRoad: boolean }[],
  from: number,
  toExcl: number,
): void {
  const end = toExcl - 1;
  if (end <= from) return;

  // Single filled shape — no per-segment strokes so there are no horizontal seams
  ctx.beginPath();
  ctx.moveTo(segs[from].centerX - segs[from].width / 2, segs[from].y);
  for (let k = from + 1; k <= end; k++) {
    ctx.lineTo(segs[k].centerX - segs[k].width / 2, segs[k].y);
  }
  for (let k = end; k >= from; k--) {
    ctx.lineTo(segs[k].centerX + segs[k].width / 2, segs[k].y);
  }
  ctx.closePath();
  ctx.fillStyle = COLORS.road;
  ctx.fill();

  // Left edge line
  ctx.beginPath();
  ctx.moveTo(segs[from].centerX - segs[from].width / 2, segs[from].y);
  for (let k = from + 1; k <= end; k++) {
    ctx.lineTo(segs[k].centerX - segs[k].width / 2, segs[k].y);
  }
  ctx.strokeStyle = COLORS.roadEdge;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Right edge line
  ctx.beginPath();
  ctx.moveTo(segs[from].centerX + segs[from].width / 2, segs[from].y);
  for (let k = from + 1; k <= end; k++) {
    ctx.lineTo(segs[k].centerX + segs[k].width / 2, segs[k].y);
  }
  ctx.stroke();

  // Dashed centre line (every ~32 px)
  ctx.fillStyle = COLORS.roadLine;
  for (let k = from; k < end - 1; k += 4) {
    const a = segs[k];
    const b = segs[k + 1];
    const mx = (a.centerX + b.centerX) / 2;
    const my = (a.y + b.y) / 2;
    ctx.fillRect(mx - 2, my - 4, 4, 8);
  }
}

function drawRugPullFire(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { time: now, flags } = state;
  if (!flags.rugBurning) return;

  const segs = [...state.road].sort((a, b) => a.y - b.y);
  const hasGaps = segs.some((s) => !s.hasRoad);
  if (!hasGaps) return;

  const intense = state.activeEvent?.id === 'rug_pull';
  // Pulsing orange-red edge vignette (stronger during the initial rug pull burst)
  const pulse = (intense ? 0.25 : 0.14) + Math.sin(now * 10) * (intense ? 0.08 : 0.04);
  const vgrd = ctx.createRadialGradient(
    state.width / 2, state.height / 2, state.height * 0.15,
    state.width / 2, state.height / 2, state.height * 0.85,
  );
  vgrd.addColorStop(0, 'rgba(255,60,0,0)');
  vgrd.addColorStop(1, `rgba(255,30,0,${pulse})`);
  ctx.fillStyle = vgrd;
  ctx.fillRect(0, 0, state.width, state.height);

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.hasRoad) continue;

    const cx = seg.centerX;
    const y = seg.y;
    const w = seg.width;

    // Dark void under the flames
    ctx.fillStyle = '#1a0505';
    ctx.fillRect(cx - w / 2, y - 4, w, 10);

    // Fire tongues
    const tongues = Math.max(5, Math.floor(w / 18));
    for (let f = 0; f < tongues; f++) {
      const progress = (f + 0.5) / tongues;
      const fx = cx - w / 2 + progress * w;
      const wobble = Math.sin(now * 11 + f * 1.7 + i * 0.9) * 6;
      const fh = Math.max(8, 22 + Math.sin(now * 8 + f * 2.1 + i * 1.3) * 10);

      ctx.beginPath();
      ctx.moveTo(fx - 7, y + 5);
      ctx.bezierCurveTo(fx - 5, y - fh * 0.3, fx + wobble - 3, y - fh * 0.8, fx + wobble, y - fh);
      ctx.bezierCurveTo(fx + wobble + 3, y - fh * 0.8, fx + 5, y - fh * 0.3, fx + 7, y + 5);
      ctx.closePath();

      const grad = ctx.createLinearGradient(fx, y + 5, fx, y - fh);
      grad.addColorStop(0, 'rgba(255,20,0,1)');
      grad.addColorStop(0.3, 'rgba(255,100,0,0.9)');
      grad.addColorStop(0.65, 'rgba(255,200,0,0.65)');
      grad.addColorStop(1, 'rgba(255,255,120,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner hot-white core on every other tongue
      if (f % 2 === 0) {
        const ch = fh * 0.35;
        ctx.beginPath();
        ctx.moveTo(fx - 3, y + 5);
        ctx.bezierCurveTo(fx - 2, y - ch * 0.5, fx + wobble * 0.4, y - ch, fx + wobble * 0.4, y - ch);
        ctx.bezierCurveTo(fx + wobble * 0.4 + 2, y - ch * 0.5, fx + 3, y - ch * 0.3, fx + 3, y + 5);
        ctx.closePath();
        const cg = ctx.createLinearGradient(fx, y + 5, fx, y - ch);
        cg.addColorStop(0, 'rgba(255,255,200,0.7)');
        cg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = cg;
        ctx.fill();
      }
    }

    // Ember sparks flying upward
    for (let e = 0; e < 3; e++) {
      const ex = cx - w / 2 + ((now * (37 + e * 13) + i * 47 + e * 61) % w);
      const phase = (now * (2 + e * 0.7) + i * 0.4 + e * 1.1) % 1;
      const ey = y - 10 - phase * 50;
      const ea = Math.max(0, 0.8 - phase);
      ctx.fillStyle = `rgba(255,${180 + e * 25},0,${ea})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fill();
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
    ctx.translate(h.x, h.y);
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.font = 'bold 9px "Comic Neue", Comic Sans MS, cursive';

    if (h.kind === 'short_squeeze') {
      // Candlestick chart background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-36, -28, 72, 52);
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(-36, -28, 72, 52);

      const bw = 10;
      const gap = 5;
      const candleData = [
        { open: 8, close: 22, high: 26, low: 4, green: true },
        { open: 20, close: 10, high: 24, low: 6, green: false },
        { open: 10, close: 24, high: 28, low: 8, green: true },
        { open: 22, close: 12, high: 25, low: 8, green: false },
      ];
      for (let i = 0; i < candleData.length; i++) {
        const d = candleData[i];
        const cx = -24 + i * (bw + gap) + bw / 2;
        const scaleY = 1.5;
        const top = -d.close / scaleY + 14;
        const body = (d.close - d.open) / scaleY;
        ctx.strokeStyle = d.green ? COLORS.candleGreen : COLORS.candleRed;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, -d.high / scaleY + 14);
        ctx.lineTo(cx, top);
        ctx.moveTo(cx, top + body);
        ctx.lineTo(cx, -d.low / scaleY + 14);
        ctx.stroke();
        ctx.fillStyle = d.green ? COLORS.candleGreen : COLORS.candleRed;
        ctx.strokeStyle = COLORS.outline;
        ctx.lineWidth = 1;
        ctx.fillRect(cx - bw / 2, top, bw, Math.max(2, body));
        ctx.strokeRect(cx - bw / 2, top, bw, Math.max(2, body));
      }
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = 2;
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
  ctx.fillRect(x - 18, y - 50, 36, 50);
  ctx.fillStyle = '#FFCC99';
  ctx.beginPath();
  ctx.arc(x, y - 58, 14, 0, Math.PI * 2);
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
  ctx.translate(lemon.x, ly);
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

function drawRugBurnIndicator(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.flags.rugBurning) return;
  if (state.activeEvent?.id === 'rug_pull') return;

  ctx.save();
  const flash = Math.sin(state.time * 14) > 0;
  ctx.font = 'bold 14px "Comic Neue", Comic Sans MS, cursive';
  const text = '🔥 ROAD ON FIRE 🔥';
  const tw = ctx.measureText(text).width;
  const bx = state.width / 2 - tw / 2 - 10;
  const by = 62;
  ctx.fillStyle = flash ? '#FF2200' : '#FF5500';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.fillRect(bx, by, tw + 20, 26);
  ctx.strokeRect(bx, by, tw + 20, 26);
  ctx.fillStyle = '#FFFF99';
  ctx.fillText(text, state.width / 2 - tw / 2, by + 18);
  ctx.restore();
}

function drawEventBanner(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.activeEvent) return;
  ctx.save();

  const isRugPull = state.activeEvent.id === 'rug_pull';
  const text = state.activeEvent.label;
  ctx.font = `bold ${isRugPull ? 32 : 28}px "Comic Neue", Comic Sans MS, cursive`;
  const tw = ctx.measureText(text).width;
  const bx = state.width / 2 - tw / 2 - 16;
  const by = 58;
  const bh = isRugPull ? 48 : 44;

  if (isRugPull) {
    // Alternating fire-red / orange flash
    const flash = Math.sin(state.time * 22) > 0;
    const bgColor = flash ? '#FF2200' : '#FF7700';
    const borderColor = flash ? '#FF7700' : '#FFDD00';

    // Glow halo behind banner
    ctx.shadowColor = '#FF4400';
    ctx.shadowBlur = 18;
    ctx.fillStyle = bgColor;
    ctx.fillRect(bx, by, tw + 32, bh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, tw + 32, bh);
    ctx.fillStyle = '#FFFF99';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, state.width / 2 - tw / 2, by + bh - 10);
    ctx.fillText(text, state.width / 2 - tw / 2, by + bh - 10);
    // Sub-text
    ctx.font = 'bold 13px "Comic Neue", Comic Sans MS, cursive';
    ctx.fillStyle = '#FFDDAA';
    ctx.fillText('🔥 LIQUIDITY GONE 🔥', state.width / 2 - 66, by + bh + 18);
  } else {
    ctx.fillStyle = '#FFFF00';
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.fillRect(bx, by, tw + 32, bh);
    ctx.strokeRect(bx, by, tw + 32, bh);
    ctx.fillStyle = COLORS.outline;
    ctx.fillText(text, state.width / 2 - tw / 2, by + bh - 8);
    if (state.activeEvent.id === 'bull_run') {
      ctx.font = 'bold 16px "Comic Neue", Comic Sans MS, cursive';
      ctx.fillText('>> NUMBER GO UP', state.width / 2 - 68, by + bh + 18);
    }
    if (state.activeEvent.id === 'dancing') {
      ctx.font = 'bold 14px "Comic Neue", Comic Sans MS, cursive';
      ctx.fillText('WAGMI (probably)', state.width / 2 - 55, by + bh + 18);
    }
  }

  ctx.restore();
}

export function renderPausedPreview(ctx: CanvasRenderingContext2D, state: GameState): void {
  renderGame(ctx, state);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, state.width, state.height);
}
