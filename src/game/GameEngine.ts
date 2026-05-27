import { AudioManager, eventToSound } from './audio';
import { getBiome } from './biomes';
import { checkCollision } from './collision';
import {
  BASE_SCROLL_SPEED,
  LEMON_SCREEN_Y_RATIO,
  MAX_SCROLL_SPEED,
  SCROLL_VISUAL_MULT,
} from './constants';
import {
  triggerWelcomeBanner,
  tryTriggerEvent,
  updateActiveEvent,
  updateCollectibles,
} from './events';
import { shouldSpawnHazard, spawnHazard, updateHazards } from './hazards';
import {
  computeInputTarget,
  createInputState,
  updateInputSmoothed,
} from './input';
import { createDefaultFlags, createLemon, updateDyingLemon, updateLemon } from './lemon';
import {
  appendRoadSegment,
  getLeadingRoadSegment,
  getSegmentAtY,
  initRoad,
  trimRoad,
} from './road';
import { renderGame, renderPausedPreview, setRenderTime } from './renderer';
import { capBonusScore, getTotalScore, updateFloatingTexts } from './scoring';
import type { GameSnapshot, GameState, InputState, RunSummary } from './types';
import { createRunSessionStats } from './types';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private input: InputState;
  private audio: AudioManager;
  private rafId = 0;
  private lastTime = 0;
  private pointerActive = false;
  private segmentCounter = 0;
  private lastSqueezeSound = 0;
  private layoutWidth = 0;
  private onSnapshot: ((s: GameSnapshot) => void) | null = null;
  private onRunEnd: ((summary: RunSummary) => void) | null = null;
  private snapshotAccum = 0;
  private runDurationMs = 0;

  constructor(canvas: HTMLCanvasElement, audio: AudioManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    this.ctx = ctx;
    this.audio = audio;
    this.input = createInputState();
    this.state = this.createInitialState();
    this.bindEvents();
  }

  private createInitialState(): GameState {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
      phase: 'idle',
      time: 0,
      distance: 0,
      bonusScore: 0,
      dodgeStreak: 0,
      scrollSpeed: BASE_SCROLL_SPEED,
      difficulty: 0,
      biomePhase: 'tutorial',
      lastBiomePhase: null,
      phaseBanner: null,
      welcomeShown: false,
      firstHazardEasy: false,
      road: [],
      lemon: createLemon(w / 2),
      hazards: [],
      collectibles: [],
      floatingTexts: [],
      nextHazardAt: 4,
      lemonSquash: 1,
      lemonSquashVel: 0,
      lastHitKind: null,
      slipperyUntil: 0,
      taxman: { active: false, x: 0, y: 0 },
      flags: createDefaultFlags(),
      activeEvent: null,
      eventQueue: [],
      nextEventAt: 15,
      offRoadFrames: 0,
      deathTime: 0,
      juiceLevel: 'stable',
      citricVelocity: 1,
      width: w,
      height: h,
      dpr,
      lemonScreenY: h * LEMON_SCREEN_Y_RATIO,
      selectedSkinId: 'default',
      runSession: createRunSessionStats(),
      playStartedAt: 0,
      decorScrollY: 0,
    };
  }

  setRunEndCallback(cb: (summary: RunSummary) => void): void {
    this.onRunEnd = cb;
  }

  setSelectedSkin(skinId: string): void {
    this.state.selectedSkinId = skinId;
  }

  setSnapshotCallback(cb: (s: GameSnapshot) => void): void {
    this.onSnapshot = cb;
  }

  getAudio(): AudioManager {
    return this.audio;
  }

  getInput(): InputState {
    return this.input;
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.state.width = w;
    this.state.height = h;
    this.state.dpr = dpr;
    this.state.lemonScreenY = h * LEMON_SCREEN_Y_RATIO;

    if (this.state.road.length === 0) {
      this.state.road = initRoad(h, w / 2, w);
      this.state.lemon.x = w / 2;
      this.layoutWidth = w;
    } else if (this.layoutWidth !== w && this.layoutWidth > 0) {
      const ratio = w / this.layoutWidth;
      for (const seg of this.state.road) {
        seg.centerX = (seg.centerX - this.layoutWidth / 2) * ratio + w / 2;
        seg.width = Math.round(seg.width * ratio);
      }
      this.state.lemon.x = (this.state.lemon.x - this.layoutWidth / 2) * ratio + w / 2;
      for (const hz of this.state.hazards) {
        hz.x = (hz.x - this.layoutWidth / 2) * ratio + w / 2;
      }
      for (const c of this.state.collectibles) {
        c.x = (c.x - this.layoutWidth / 2) * ratio + w / 2;
      }
      if (this.state.taxman.active) {
        this.state.taxman.x = (this.state.taxman.x - this.layoutWidth / 2) * ratio + w / 2;
      }
      this.layoutWidth = w;
    }
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.keys.right = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.keys.right = false;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.pointerActive = true;
      this.input.isDragging = true;
      this.updateDragPosition(e);
      this.canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.pointerActive) return;
      this.updateDragPosition(e);
      e.preventDefault();
    });

    const releasePointer = (e: PointerEvent) => {
      if (!this.pointerActive) return;
      if (this.canvas.hasPointerCapture(e.pointerId)) {
        this.canvas.releasePointerCapture(e.pointerId);
      }
      this.pointerActive = false;
      this.input.isDragging = false;
      this.input.dragX = null;
    };

    this.canvas.addEventListener('pointerup', releasePointer);
    this.canvas.addEventListener('pointercancel', releasePointer);
    this.canvas.addEventListener('lostpointercapture', () => {
      this.pointerActive = false;
      this.input.isDragging = false;
      this.input.dragX = null;
    });
  }

  private updateDragPosition(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.input.dragX = e.clientX - rect.left;
  }

  setTilt(x: number, granted: boolean): void {
    this.input.tiltX = x;
    this.input.tiltGranted = granted;
  }

  start(): void {
    this.audio.resume();
    if (!this.audio.isMuted()) this.audio.startBg();
    this.audio.play('start');

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.layoutWidth = 0;
    this.state = this.createInitialState();
    this.state.width = w;
    this.state.height = h;
    this.state.lemonScreenY = h * LEMON_SCREEN_Y_RATIO;
    this.state.road = initRoad(h, w / 2, w);
    this.state.lemon.x = w / 2;
    this.layoutWidth = w;
    this.state.phase = 'playing';
    this.state.difficulty = 0;
    this.state.firstHazardEasy = true;
    this.state.nextHazardAt = 4;
    this.state.nextEventAt = 6;
    this.state.eventQueue = ['liquidity_added'];
    this.state.runSession = createRunSessionStats();
    this.state.playStartedAt = performance.now();
    this.runDurationMs = 0;
    this.segmentCounter = 0;
    this.lastTime = performance.now();
  }

  reset(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.layoutWidth = 0;
    this.state = this.createInitialState();
    this.state.width = w;
    this.state.height = h;
    this.state.lemonScreenY = h * LEMON_SCREEN_Y_RATIO;
    this.state.road = initRoad(h, w / 2, w);
    this.state.lemon.x = w / 2;
    this.layoutWidth = w;
    this.state.phase = 'idle';
    this.lastTime = performance.now();
  }

  startLoop(): void {
    this.resize();
    this.lastTime = performance.now();
    this.loop();
  }

  stopLoop(): void {
    cancelAnimationFrame(this.rafId);
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;

    this.update(dt);
    this.render();
    this.emitSnapshot(dt);
  };

  private updateBiome(s: GameState): void {
    const biome = getBiome(s.distance);
    s.difficulty = biome.difficulty;
    s.biomePhase = biome.phase;
    s.juiceLevel = biome.juiceLevel;

    if (biome.phase !== s.lastBiomePhase && biome.banner) {
      s.phaseBanner = { label: biome.banner, until: s.time + 2 };
    }
    s.lastBiomePhase = biome.phase;
  }

  private update(dt: number): void {
    const s = this.state;
    s.time += dt;
    setRenderTime(s.time);

    if (s.phase === 'playing' && s.playStartedAt > 0) {
      this.runDurationMs = performance.now() - s.playStartedAt;
    }

    const roadSeg = getSegmentAtY(s.road, s.lemonScreenY);
    const centerX = roadSeg?.centerX ?? s.width / 2;

    this.input.target = computeInputTarget(this.input, s.width, centerX);
    const inputSmoothed = updateInputSmoothed(this.input, dt);

    if (s.phase === 'idle') {
      this.idleWiggle(dt);
      return;
    }

    if (s.phase === 'dying') {
      updateDyingLemon(s.lemon, dt);
      if (s.time - s.deathTime > 2) {
        s.phase = 'dead';
        this.emitRunEnd();
      }
      updateFloatingTexts(s, dt);
      return;
    }

    if (s.phase === 'dead') return;

    if (s.time < s.flags.freezeUntil) return;

    if (!s.welcomeShown && s.time >= 2) {
      s.welcomeShown = true;
      triggerWelcomeBanner(s, s.time);
    }

    if (s.phaseBanner && s.time >= s.phaseBanner.until) {
      s.phaseBanner = null;
    }

    this.updateBiome(s);

    s.scrollSpeed = Math.min(
      MAX_SCROLL_SPEED,
      BASE_SCROLL_SPEED + s.difficulty * 5.33,
    );
    s.citricVelocity = 1 + Math.sin(s.time * 5) * 0.3 + s.difficulty * 0.2;

    s.flags.screenShake *= 0.85;
    if (s.flags.screenShake < 0.4) s.flags.screenShake = 0;

    if (!s.flags.scrollPaused) {
      const scrollDelta =
        s.scrollSpeed * s.flags.scrollMultiplier * dt * SCROLL_VISUAL_MULT;
      for (const seg of s.road) {
        seg.y += scrollDelta;
      }
      s.decorScrollY += scrollDelta;
      const baseDistGain = scrollDelta * 0.12;
      s.distance += baseDistGain;
      if (s.flags.scoreMultiplier > 1) {
        s.bonusScore += baseDistGain * (s.flags.scoreMultiplier - 1);
        capBonusScore(s);
      }

      if (shouldSpawnHazard(s, s.time)) {
        if (s.firstHazardEasy) {
          spawnHazard(s, 'monthly_inflation');
          s.firstHazardEasy = false;
        } else {
          spawnHazard(s);
        }
      }
      updateHazards(s, scrollDelta);
      updateCollectibles(s, scrollDelta);

      if (s.lastHitKind && s.time - this.lastSqueezeSound > 0.15) {
        this.audio.play('squeeze');
        this.lastSqueezeSound = s.time;
        s.lastHitKind = null;
      } else if (s.lastHitKind) {
        s.lastHitKind = null;
      }

      while (true) {
        if (s.road.length === 0) break;
        const topY = Math.min(...s.road.map((r) => r.y));
        if (topY < 0) break;
        const rugActive = s.flags.rugBurning;
        const hasRoad = !rugActive || Math.random() > 0.35;
        const seg = appendRoadSegment(
          s.road,
          s.time * 1000,
          this.segmentCounter++,
          s.difficulty,
          s.distance,
          s.width,
          hasRoad,
          s.flags.roadWidthMult,
        );
        if (s.flags.rugBurning && Math.random() < 0.3) {
          seg.hasRoad = false;
        }
        s.road.push(seg);
      }

      s.road = trimRoad(s.road, s.height + 50);
    }

    if (
      s.flags.slippery &&
      s.time > s.slipperyUntil &&
      s.time >= s.flags.lemonadeUntil
    ) {
      s.flags.slippery = false;
    }

    const squash = updateLemon(
      s.lemon,
      inputSmoothed,
      dt,
      s.time,
      s.flags,
      s.width,
      { amount: s.lemonSquash, vel: s.lemonSquashVel },
    );
    s.lemonSquash = squash.amount;
    s.lemonSquashVel = squash.vel;

    const eventId = tryTriggerEvent(s, s.time);
    if (eventId) {
      const sound = eventToSound(eventId);
      if (sound) this.audio.play(sound);
    }

    updateActiveEvent(s, s.time, dt);
    updateFloatingTexts(s, dt);

    const col = checkCollision(s.lemon, s.lemonScreenY, s.road, s.offRoadFrames);
    s.offRoadFrames = col.offRoadFrames;
    if (col.hit) {
      this.triggerDeath();
    }
  }

  private triggerDeath(): void {
    const s = this.state;
    if (s.phase !== 'playing') return;

    const seg = getLeadingRoadSegment(s.road);
    const noRoad = s.flags.rugBurning || !seg?.hasRoad;
    s.runSession.deathLastHazard = s.lastHitKind;
    s.runSession.activeEventAtDeath = s.activeEvent?.id ?? null;
    s.runSession.deathCause = noRoad ? 'no_road' : 'off_road';

    s.phase = 'dying';
    s.deathTime = s.time;
    s.flags.screenShake = 8;
    this.audio.play('scream');
    this.audio.play('error');
  }

  private buildRunSummary(): RunSummary {
    const s = this.state;
    const rs = s.runSession;
    const total = Math.floor(getTotalScore(s));
    const bestGap =
      typeof localStorage !== 'undefined'
        ? (() => {
            try {
              const raw = localStorage.getItem('lemonroad_progress_v1');
              if (!raw) return undefined;
              const p = JSON.parse(raw) as { bestDistance?: number };
              const best = p.bestDistance ?? 0;
              if (best <= 0 || total >= best) return undefined;
              return best - total;
            } catch {
              return undefined;
            }
          })()
        : undefined;

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      distance: total,
      baseDistance: Math.floor(s.distance),
      bonusScore: Math.floor(s.bonusScore),
      durationMs: this.runDurationMs || Math.max(0, performance.now() - s.playStartedAt),
      deathCause: rs.deathCause ?? 'off_road',
      activeEventAtDeath: rs.activeEventAtDeath,
      lastHazardHit: rs.deathLastHazard,
      selectedSkin: s.selectedSkinId,
      deathTitle: null,
      survivedEvents: { ...rs.survivedEvents },
      hazardDodges: { ...rs.hazardDodges },
      whaleEventSurvivals: rs.whaleEventSurvivals,
      wasClosestToRewardZone: bestGap != null && bestGap <= 50,
      rankDeltaPlaceholder: bestGap,
    };
  }

  private emitRunEnd(): void {
    const s = this.state;
    if (s.runSession.runEnded || !this.onRunEnd) return;
    s.runSession.runEnded = true;
    this.onRunEnd(this.buildRunSummary());
  }

  private idleWiggle(dt: number): void {
    const s = this.state;
    s.lemon.x = s.width / 2 + Math.sin(s.time * 2) * 40;
    s.lemon.rotation = Math.sin(s.time * 3) * 0.2;

    const speed = dt * 55;
    for (const seg of s.road) {
      seg.y += speed;
    }
    s.decorScrollY += speed;
    while (true) {
      if (s.road.length === 0) break;
      const topY = Math.min(...s.road.map((r) => r.y));
      if (topY < 0) break;
      const seg = appendRoadSegment(
        s.road,
        s.time * 1000,
        this.segmentCounter++,
        0.3,
        0,
        s.width,
        true,
      );
      s.road.push(seg);
    }
    s.road = trimRoad(s.road, s.height + 50);
  }

  private render(): void {
    const s = this.state;
    if (s.phase === 'idle') {
      renderPausedPreview(this.ctx, s);
    } else {
      renderGame(this.ctx, s);
    }
  }

  private emitSnapshot(dt: number): void {
    this.snapshotAccum += dt;
    if (this.snapshotAccum < 0.1 || !this.onSnapshot) return;
    this.snapshotAccum = 0;
    this.onSnapshot(this.getSnapshot());
  }

  getSnapshot(): GameSnapshot {
    const s = this.state;
    const total = Math.floor(getTotalScore(s));
    return {
      phase: s.phase,
      distance: total,
      bonusScore: Math.floor(s.bonusScore),
      dodgeStreak: s.dodgeStreak,
      juiceLevel: s.juiceLevel,
      citricVelocity: s.citricVelocity,
      activeEventLabel: s.activeEvent?.label ?? null,
      biomePhase: s.biomePhase,
      muted: this.audio.isMuted(),
    };
  }

  getState(): GameState {
    return this.state;
  }
}
