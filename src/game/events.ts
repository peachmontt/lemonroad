import type { GameState, MemeEventId } from './types';

const ALL_EVENTS: MemeEventId[] = [
  'rug_pull',
  'irs',
  'lemonade_spill',
  'knife',
  'dancing',
  'market_crash',
  'bull_run',
];

const EVENT_META: Record<MemeEventId, { label: string; durationMs: number }> = {
  rug_pull: { label: 'RUG PULL!!!', durationMs: 1200 },
  irs: { label: 'SEC INVESTIGATION', durationMs: 6000 },
  lemonade_spill: { label: 'LIQUIDITY VACUUM', durationMs: 4000 },
  knife: { label: 'WHALE DUMP', durationMs: 800 },
  dancing: { label: 'CT PUMP POST', durationMs: 3000 },
  market_crash: { label: 'MARKET CRASH -50%', durationMs: 3500 },
  bull_run: { label: 'NUMBER GO UP', durationMs: 5000 },
};

function pickRandomEvent(): MemeEventId {
  return ALL_EVENTS[Math.floor(Math.random() * ALL_EVENTS.length)];
}

export function scheduleNextEvent(state: GameState, now: number): void {
  state.nextEventAt = now + 8 + Math.random() * 6;
}

export function tryTriggerEvent(state: GameState, now: number): MemeEventId | null {
  if (state.phase !== 'playing') return null;
  if (state.activeEvent) return null;
  if (now < state.nextEventAt) return null;

  const id = state.eventQueue.shift() ?? pickRandomEvent();
  startEvent(state, id, now);
  scheduleNextEvent(state, now);
  return id;
}

export function startEvent(state: GameState, id: MemeEventId, now: number): void {
  const meta = EVENT_META[id];
  const endsAt = now + meta.durationMs / 1000;

  state.activeEvent = { id, label: meta.label, endsAt };
  const f = state.flags;

  switch (id) {
    case 'rug_pull':
      f.rugHoleUntil = endsAt;
      for (let i = 0; i < 8; i++) {
        const idx = state.road.length - 1 - i;
        if (idx >= 0) state.road[idx].hasRoad = false;
      }
      break;
    case 'irs':
      state.taxman = { active: true, x: state.lemon.x - 120, y: state.lemonScreenY + 80 };
      break;
    case 'lemonade_spill':
      f.lemonadeUntil = endsAt;
      f.slippery = true;
      break;
    case 'knife':
      f.knifeSlashUntil = endsAt;
      f.freezeUntil = now + 0.2;
      state.lemon.vx += (Math.random() > 0.5 ? 1 : -1) * (7 + state.difficulty * 1.5);
      state.lemonSquash = 0.55;
      state.lemonSquashVel = -0.10;
      break;
    case 'dancing':
      f.dancingUntil = endsAt;
      f.scrollPaused = true;
      break;
    case 'market_crash':
      f.marketCrashUntil = endsAt;
      f.screenShake = 18;
      break;
    case 'bull_run':
      f.bullRunUntil = endsAt;
      f.scrollMultiplier = 2;
      f.greenTint = 1;
      break;
  }
}

export function updateActiveEvent(state: GameState, now: number, dt: number): void {
  const ev = state.activeEvent;
  if (!ev) return;

  if (now >= ev.endsAt) {
    endEvent(state, ev.id);
    state.activeEvent = null;
    return;
  }

  if (ev.id === 'irs' && state.taxman.active) {
    const dx = state.lemon.x - state.taxman.x;
    const dy = state.lemonScreenY - state.taxman.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 2.5 + state.difficulty * 0.5;
    if (dist > 5) {
      state.taxman.x += (dx / dist) * speed * dt * 60;
      state.taxman.y += (dy / dist) * speed * dt * 60;
    }
    if (dist < 55) {
      const dir = state.lemon.x > state.taxman.x ? 1 : -1;
      state.lemon.vx += dir * (7 + state.difficulty);
      state.lemon.x += dir * 8;
      state.lemonSquash = 0.65;
      state.lemonSquashVel = -0.08;
    }
  }

  if (ev.id === 'market_crash') {
    state.flags.screenShake = 8 + Math.random() * 6;
    if (Math.random() < 0.06) {
      state.lemon.vx += (Math.random() - 0.5) * (5 + state.difficulty * 1.5);
      state.lemonSquash = Math.min(state.lemonSquash, 0.8);
    }
  }
}

function endEvent(state: GameState, id: MemeEventId): void {
  const f = state.flags;
  switch (id) {
    case 'irs':
      state.taxman.active = false;
      break;
    case 'lemonade_spill':
      f.slippery = false;
      f.lemonadeUntil = 0;
      break;
    case 'dancing':
      f.scrollPaused = false;
      f.dancingUntil = 0;
      break;
    case 'bull_run':
      f.scrollMultiplier = 1;
      f.greenTint = 0;
      f.bullRunUntil = 0;
      break;
    case 'market_crash':
      f.screenShake = 0;
      f.marketCrashUntil = 0;
      break;
    case 'rug_pull':
      f.rugHoleUntil = 0;
      break;
    case 'knife':
      f.knifeSlashUntil = 0;
      break;
  }
}
