import { AudioManager, eventToSound } from './audio';
import { checkCollision } from './collision';
import {
  BASE_SCROLL_SPEED,
  LEMON_SCREEN_Y_RATIO,
  MAX_SCROLL_SPEED,
  SCROLL_VISUAL_MULT,
} from './constants';
import { shouldSpawnHazard, spawnHazard, updateHazards } from './hazards';
import { tryTriggerEvent, scheduleNextEvent, updateActiveEvent } from './events';
import {
  computeInputTarget,
  createInputState,
  updateInputSmoothed,
} from './input';
import { createLemon, updateDyingLemon, updateLemon } from './lemon';
import {
  appendRoadSegment,
  initRoad,
  trimRoad,
} from './road';
import { renderGame, renderPausedPreview, setRenderTime } from './renderer';
import type { GameSnapshot, GameState, InputState } from './types';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private input: InputState;
  private audio: AudioManager;
  private rafId = 0;
  private lastTime = 0;
  private mouseX: number | null = null;
  private canvasLeft = 0;
  private segmentCounter = 0;
  private lastSqueezeSound = 0;
  private layoutWidth = 0;
  private onSnapshot: ((s: GameSnapshot) => void) | null = null;
  private snapshotAccum = 0;

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
      scrollSpeed: BASE_SCROLL_SPEED,
      difficulty: 0,
      road: [],
      lemon: createLemon(w / 2),
      hazards: [],
      nextHazardAt: 4,
      lemonSquash: 1,
      lemonSquashVel: 0,
      lastHitKind: null,
      slipperyUntil: 0,
      taxman: { active: false, x: 0, y: 0 },
      flags: {
        scrollPaused: false,
        scrollMultiplier: 1,
        slippery: false,
        screenShake: 0,
        greenTint: 0,
        freezeUntil: 0,
        rugBurning: false,
        knifeSlashUntil: 0,
        dancingUntil: 0,
        bullRunUntil: 0,
        marketCrashUntil: 0,
        lemonadeUntil: 0,
      },
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
    };
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

    // Only set the internal drawing buffer — CSS grid sizes the element.
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.state.width = w;
    this.state.height = h;
    this.state.dpr = dpr;
    this.state.lemonScreenY = h * LEMON_SCREEN_Y_RATIO;

    // Initialise road on first call; rescale on subsequent size changes
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

    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      const rect = this.canvas.getBoundingClientRect();
      this.canvasLeft = rect.left;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = null;
    });

    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.input.touchX = t.clientX - rect.left;
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.input.touchX = t.clientX - rect.left;
      },
      { passive: false },
    );

    this.canvas.addEventListener('touchend', () => {
      this.input.touchX = null;
    });
  }

  setTilt(x: number, granted: boolean): void {
    this.input.tiltX = x;
    this.input.tiltGranted = granted;
  }

  start(): void {
    this.audio.resume();
    if (!this.audio.isMuted()) this.audio.startBg();
    this.audio.play('start');

    // Use actual viewport dimensions
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
    this.segmentCounter = 0;
    scheduleNextEvent(this.state, 8);
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

  private update(dt: number): void {
    const s = this.state;
    s.time += dt;
    setRenderTime(s.time);

    this.input.target = computeInputTarget(
      this.input,
      this.mouseX,
      s.width,
      this.canvasLeft,
    );
    const inputSmoothed = updateInputSmoothed(this.input, dt);

    if (s.phase === 'idle') {
      this.idleWiggle(dt);
      return;
    }

    if (s.phase === 'dying') {
      updateDyingLemon(s.lemon, dt);
      if (s.time - s.deathTime > 2) {
        s.phase = 'dead';
      }
      return;
    }

    if (s.phase === 'dead') return;

    if (s.time < s.flags.freezeUntil) return;

    // Difficulty reaches max (3) at ~1800 distance units ≈ 90 s of play
    s.difficulty = Math.min(3, s.distance / 600);
    // Speed ramp: hits MAX_SCROLL_SPEED at ~1600 distance units
    s.scrollSpeed = Math.min(
      MAX_SCROLL_SPEED,
      BASE_SCROLL_SPEED + s.distance * 0.010,
    );
    s.citricVelocity = 1 + Math.sin(s.time * 5) * 0.3 + s.difficulty * 0.2;
    s.juiceLevel =
      s.distance < 100
        ? 'mild'
        : s.distance < 300
          ? 'unstable'
          : s.distance < 600
            ? 'critical'
            : 'catastrophic';

    // Decay screen shake every frame so it naturally fades out
    s.flags.screenShake *= 0.85;
    if (s.flags.screenShake < 0.4) s.flags.screenShake = 0;

    if (!s.flags.scrollPaused) {
      const scrollDelta =
        s.scrollSpeed * s.flags.scrollMultiplier * dt * SCROLL_VISUAL_MULT;
      for (const seg of s.road) {
        seg.y += scrollDelta;
      }
      s.distance += scrollDelta * 0.12;

      if (shouldSpawnHazard(s, s.time)) {
        spawnHazard(s);
      }
      updateHazards(s, scrollDelta);
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

    const col = checkCollision(s.lemon, s.lemonScreenY, s.road, s.offRoadFrames);
    s.offRoadFrames = col.offRoadFrames;
    if (col.hit) {
      this.triggerDeath();
    }
  }

  private triggerDeath(): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    s.phase = 'dying';
    s.deathTime = s.time;
    s.flags.screenShake = 8;
    this.audio.play('scream');
    this.audio.play('error');
  }

  private idleWiggle(dt: number): void {
    const s = this.state;
    s.lemon.x = s.width / 2 + Math.sin(s.time * 2) * 40;
    s.lemon.rotation = Math.sin(s.time * 3) * 0.2;

    const speed = dt * 55;
    for (const seg of s.road) {
      seg.y += speed;
    }
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
    return {
      phase: s.phase,
      distance: Math.floor(s.distance),
      juiceLevel: s.juiceLevel,
      citricVelocity: s.citricVelocity,
      activeEventLabel: s.activeEvent?.label ?? null,
      muted: this.audio.isMuted(),
    };
  }

  getState(): GameState {
    return this.state;
  }
}
