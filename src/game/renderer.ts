import { COLORS, isNarrowScreen, LEMON_RADIUS } from './constants';
import { getHazardLabel } from './hazards';
import { getSegmentAtY } from './road';
import {
  drawFieldDecorations,
  drawRoadsideSigns,
  drawSideDust,
  hash,
} from './scenery';
import type { GameState } from './types';

export function setRenderTime(_t: number): void {
  // Reserved for time-synced effects; road scenery uses decorScrollY.
}

/** Clearance below DOM HUD (logo + daily strip) before canvas banners */
function hudClearanceY(width: number): number {
  return isNarrowScreen(width) ? 112 : 148;
}

type ComicBannerOpts = {
  text: string;
  y: number;
  fontSize: number;
  bg: string;
  fg: string;
  strokeText?: boolean;
  /** When false, draw label only (no box) */
  box?: boolean;
};

function drawComicBanner(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  opts: ComicBannerOpts,
): number {
  ctx.save();
  ctx.font = `bold ${opts.fontSize}px "Comic Neue", Comic Sans MS, cursive`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const tw = ctx.measureText(opts.text).width;
  const padX = 16;
  const padY = 10;
  const boxW = Math.min(tw + padX * 2, state.width - 24);
  const boxH = opts.fontSize + padY * 2;
  const bx = (state.width - boxW) / 2;
  const by = opts.y;
  const drawBox = opts.box !== false;

  if (drawBox) {
    ctx.fillStyle = opts.bg;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx, by, boxW, boxH);
  }

  const textX = drawBox ? bx + (boxW - tw) / 2 : (state.width - tw) / 2;
  const textY = drawBox ? by + boxH - padY : by + opts.fontSize;
  ctx.fillStyle = opts.fg;
  if (opts.strokeText) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLORS.outline;
    ctx.strokeText(opts.text, textX, textY);
  }
  ctx.fillText(opts.text, textX, textY);
  ctx.restore();
  return drawBox ? by + boxH : by + opts.fontSize + padY;
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

  drawGrass(ctx, state);

  drawFieldDecorations(ctx, state);
  drawSideDust(ctx, state);

  if (flags.greenTint > 0) {
    ctx.fillStyle = `rgba(255, 210, 60, ${0.1 * flags.greenTint})`;
    ctx.fillRect(0, 0, width, height);
  }

  drawRoadsideSigns(ctx, state);
  drawSpeedLines(ctx, state);
  drawRoad(ctx, state);
  drawRugPullFire(ctx, state);
  drawPuddles(ctx, state);
  drawHazards(ctx, state);
  drawCollectibles(ctx, state);
  drawTaxman(ctx, state);
  drawLemon(ctx, state);
  drawKnifeSlash(ctx, state);
  drawFloatingTexts(ctx, state);
  drawPhaseBanner(ctx, state);
  drawEventBanner(ctx, state);
  drawInfluencerPopup(ctx, state);
  drawClaimFailed(ctx, state);
  drawRugBurnIndicator(ctx, state);

  ctx.restore();
}

function drawGrass(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width: w, height: h, decorScrollY } = state;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, COLORS.grassWarm);
  grad.addColorStop(0.45, COLORS.grass);
  grad.addColorStop(1, COLORS.grassDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (isNarrowScreen(w)) return;

  const firstI = Math.floor(decorScrollY / 40) - 1;
  const lastI = Math.ceil((decorScrollY + h) / 40) + 1;
  for (let i = firstI; i <= lastI; i++) {
    const y = i * 40 - decorScrollY;
    if (y < -12 || y > h + 12) continue;
    const x = (i * 97) % Math.max(1, w - 80) + 40;
    ctx.fillStyle = i % 3 === 0 ? COLORS.grassWarm : COLORS.grassDark;
    ctx.fillRect(x, y, 4, 7);
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
      drawRoadRun(ctx, segs, runStart, i, state.width);
      runStart = -1;
    }
  }
}

type RoadPt = { centerX: number; y: number; width: number };

function smoothCoord(segs: RoadPt[], k: number, from: number, end: number): RoadPt {
  const lo = Math.max(from, k - 6);
  const hi = Math.min(end, k + 6);
  let cx = 0;
  let w = 0;
  let n = 0;
  for (let i = lo; i <= hi; i++) {
    cx += segs[i].centerX;
    w += segs[i].width;
    n++;
  }
  return { centerX: cx / n, y: segs[k].y, width: w / n };
}

function traceRoadPath(
  ctx: CanvasRenderingContext2D,
  segs: RoadPt[],
  from: number,
  end: number,
): void {
  const s0 = smoothCoord(segs, from, from, end);
  ctx.beginPath();
  ctx.moveTo(s0.centerX - s0.width / 2, s0.y);
  for (let k = from + 1; k <= end; k++) {
    const s = smoothCoord(segs, k, from, end);
    ctx.lineTo(s.centerX - s.width / 2, s.y);
  }
  for (let k = end; k >= from; k--) {
    const s = smoothCoord(segs, k, from, end);
    ctx.lineTo(s.centerX + s.width / 2, s.y);
  }
  ctx.closePath();
}

function traceRoadEdge(
  ctx: CanvasRenderingContext2D,
  segs: RoadPt[],
  from: number,
  end: number,
  side: 'left' | 'right',
): void {
  const s0 = smoothCoord(segs, from, from, end);
  const half0 = s0.width / 2;
  ctx.beginPath();
  ctx.moveTo(
    side === 'left' ? s0.centerX - half0 : s0.centerX + half0,
    s0.y,
  );
  for (let k = from + 1; k <= end; k++) {
    const s = smoothCoord(segs, k, from, end);
    const half = s.width / 2;
    ctx.lineTo(
      side === 'left' ? s.centerX - half : s.centerX + half,
      s.y,
    );
  }
}

function drawRoadTexture(
  ctx: CanvasRenderingContext2D,
  segs: { centerX: number; y: number; width: number }[],
  from: number,
  end: number,
): void {
  const yMin = segs[from].y;
  const yMax = segs[end].y;
  const span = Math.max(1, yMax - yMin);
  const runSeed = from * 31 + end;
  const midCx = (segs[from].centerX + segs[end].centerX) / 2;
  const midW = (segs[from].width + segs[end].width) / 2;

  const dotCount = Math.min(8, 4 + Math.floor((end - from) / 10));
  for (let d = 0; d < dotCount; d++) {
    const h = hash(runSeed + d);
    const hy = hash(runSeed + d + 50);
    const px = midCx + (h - 0.5) * midW * 0.5;
    const py = yMin + hy * span;
    ctx.fillStyle = `rgba(0,0,0,${0.05 + h * 0.03})`;
    ctx.fillRect(px - 1, py - 1, 2, 2);
  }

  const patchCount = Math.min(2, 1 + Math.floor((end - from) / 35));
  for (let p = 0; p < patchCount; p++) {
    const h = hash(runSeed + 100 + p);
    const pw = 10 + hash(runSeed + 110 + p) * 12;
    const ph = 5 + hash(runSeed + 120 + p) * 6;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(midCx - pw / 2, yMin + h * span * 0.85, pw, ph);
  }
}

function drawRoadRun(
  ctx: CanvasRenderingContext2D,
  segs: { centerX: number; y: number; width: number; hasRoad: boolean }[],
  from: number,
  toExcl: number,
  screenWidth: number,
): void {
  const end = toExcl - 1;
  if (end <= from) return;

  const narrow = isNarrowScreen(screenWidth);

  traceRoadPath(ctx, segs, from, end);
  ctx.fillStyle = COLORS.road;
  ctx.fill();

  if (!narrow) {
    ctx.save();
    traceRoadPath(ctx, segs, from, end);
    ctx.clip();
    drawRoadTexture(ctx, segs, from, end);
    ctx.restore();
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (narrow) {
    ctx.strokeStyle = COLORS.grassDark;
    ctx.lineWidth = 14;
    traceRoadEdge(ctx, segs, from, end, 'left');
    ctx.stroke();
    traceRoadEdge(ctx, segs, from, end, 'right');
    ctx.stroke();
  }

  ctx.strokeStyle = COLORS.roadEdge;
  ctx.lineWidth = narrow ? 3 : 4;
  traceRoadEdge(ctx, segs, from, end, 'left');
  ctx.stroke();
  traceRoadEdge(ctx, segs, from, end, 'right');
  ctx.stroke();

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
    const y = (i * 89 + state.decorScrollY * 2.5) % state.height;
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
  const skinId = state.selectedSkinId ?? 'default';

  ctx.save();
  ctx.translate(lemon.x, ly);
  if (dancing) {
    ctx.translate(0, Math.sin(state.time * 12) * 15);
  }
  ctx.rotate(lemon.rotation + (state.phase === 'dying' ? lemon.spinSpeed * 10 : 0));
  const sq = lemon.squashX ?? 1;
  ctx.scale(lemon.scale * sq, lemon.scale / Math.max(0.5, sq));

  const r = LEMON_RADIUS;
  const skinColors = getSkinColors(skinId);

  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = skinColors.fill;
  ctx.fill();
  ctx.strokeStyle = skinColors.stroke;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = skinColors.dark;
  ctx.beginPath();
  ctx.ellipse(-6, -4, 4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  applySkinExtras(ctx, skinId, r);

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

function getSkinColors(skinId: string): { fill: string; dark: string; stroke: string } {
  switch (skinId) {
    case 'golden':
      return { fill: '#FFD700', dark: '#E6C200', stroke: COLORS.outline };
    case 'burnt':
      return { fill: '#B8860B', dark: '#5C4033', stroke: '#3E2723' };
    case 'diamond_hands':
      return { fill: '#FFE135', dark: '#4FC3F7', stroke: COLORS.outline };
    case 'rugged':
      return { fill: '#FFE135', dark: '#DEB887', stroke: COLORS.outline };
    case 'whale_bait':
      return { fill: '#FFE135', dark: '#7B1FA2', stroke: COLORS.outline };
    default:
      return { fill: COLORS.lemon, dark: COLORS.lemonDark, stroke: COLORS.outline };
  }
}

function applySkinExtras(ctx: CanvasRenderingContext2D, skinId: string, r: number): void {
  switch (skinId) {
    case 'golden':
      ctx.fillStyle = '#FFF8DC';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-r * 0.5 + i * 12, -r * 0.6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'burnt':
      ctx.fillStyle = '#3E2723';
      ctx.beginPath();
      ctx.arc(8, 6, 3, 0, Math.PI * 2);
      ctx.arc(-10, 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'diamond_hands':
      ctx.fillStyle = 'rgba(79, 195, 247, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.7, r * 0.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'rugged':
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.lineTo(6, 8);
      ctx.stroke();
      ctx.fillStyle = '#FFF';
      ctx.fillRect(-4, -8, 14, 5);
      ctx.strokeRect(-4, -8, 14, 5);
      break;
    case 'whale_bait':
      ctx.fillStyle = '#7B1FA2';
      ctx.beginPath();
      ctx.arc(r * 0.55, -r * 0.3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7B1FA2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r * 0.7, -r * 0.5, 6, Math.PI, Math.PI * 1.8);
      ctx.stroke();
      break;
  }
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

  const flash = Math.sin(state.time * 14) > 0;
  drawComicBanner(ctx, state, {
    text: '🔥 ROAD ON FIRE 🔥',
    y: hudClearanceY(state.width),
    fontSize: 14,
    bg: flash ? '#FF2200' : '#FF5500',
    fg: '#FFFF99',
  });
}

function drawEventBanner(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.activeEvent) return;
  // Influencer uses center popup only — avoid duplicate label at top
  if (state.activeEvent.id === 'influencer_call') return;

  const isRugPull = state.activeEvent.id === 'rug_pull';
  const text = state.activeEvent.label;
  const narrow = isNarrowScreen(state.width);
  const fontPx = narrow ? (isRugPull ? 20 : 18) : isRugPull ? 28 : 24;
  const by = hudClearanceY(state.width);

  if (isRugPull) {
    const flash = Math.sin(state.time * 22) > 0;
    const bottom = drawComicBanner(ctx, state, {
      text,
      y: by,
      fontSize: fontPx,
      bg: flash ? '#FF2200' : '#FF7700',
      fg: '#FFFF99',
      strokeText: true,
    });
    drawComicBanner(ctx, state, {
      text: '🔥 LIQUIDITY GONE 🔥',
      y: bottom + 6,
      fontSize: 12,
      bg: '#000',
      fg: '#FFDDAA',
      box: false,
    });
    return;
  }

  const bottom = drawComicBanner(ctx, state, {
    text,
    y: by,
    fontSize: fontPx,
    bg: '#FFFF00',
    fg: COLORS.outline,
  });

  if (state.activeEvent.id === 'bull_run') {
    drawComicBanner(ctx, state, {
      text: '>> NUMBER GO UP',
      y: bottom + 4,
      fontSize: narrow ? 13 : 15,
      bg: '#000',
      fg: COLORS.outline,
      box: false,
    });
  }
  if (state.activeEvent.id === 'dancing') {
    drawComicBanner(ctx, state, {
      text: 'WAGMI (probably)',
      y: bottom + 4,
      fontSize: narrow ? 12 : 14,
      bg: '#000',
      fg: COLORS.outline,
      box: false,
    });
  }
}

function drawCollectibles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const c of state.collectibles) {
    if (!c.active) continue;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = '#FF4081';
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Comic Neue", Comic Sans MS, cursive';
    ctx.fillText('🎁', -12, 8);
    ctx.font = 'bold 9px "Comic Neue", Comic Sans MS, cursive';
    ctx.fillStyle = COLORS.outline;
    ctx.fillText('FREE', -12, c.h / 2 + 12);
    ctx.restore();
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const ft of state.floatingTexts) {
    const alpha = Math.min(1, ft.life / 0.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    const fontSize = state.width < 400 ? 14 : 16;
    ctx.font = `bold ${fontSize}px "Comic Neue", Comic Sans MS, cursive`;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function drawPhaseBanner(ctx: CanvasRenderingContext2D, state: GameState): void {
  const banner = state.phaseBanner;
  if (!banner || state.time >= banner.until) return;

  const fontSize = isNarrowScreen(state.width) ? 18 : 24;
  drawComicBanner(ctx, state, {
    text: banner.label,
    y: Math.max(hudClearanceY(state.width) + 8, state.height * 0.2),
    fontSize,
    bg: '#00E5FF',
    fg: '#000',
  });
}

function drawInfluencerPopup(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.time >= state.flags.influencerPopupUntil) return;
  if (state.activeEvent?.id !== 'influencer_call') return;

  const fontSize = isNarrowScreen(state.width) ? 15 : 18;
  drawComicBanner(ctx, state, {
    text: 'THIS IS THE NEXT 100X',
    y: state.height * 0.32,
    fontSize,
    bg: '#00C853',
    fg: '#fff',
    strokeText: true,
  });
}

function drawClaimFailed(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.time >= state.flags.claimFailedUntil) return;

  const fontSize = isNarrowScreen(state.width) ? 22 : 28;
  drawComicBanner(ctx, state, {
    text: 'CLAIM FAILED',
    y: state.height * 0.4,
    fontSize,
    bg: '#FF1744',
    fg: '#fff',
    strokeText: true,
  });
}

export function renderPausedPreview(ctx: CanvasRenderingContext2D, state: GameState): void {
  renderGame(ctx, state);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, state.width, state.height);
}
