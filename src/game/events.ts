import { LEMON_RADIUS } from './constants';
import { getLeadingRoadSegment, randomXOnRoad } from './road';
import { awardLemonHands, spawnFloatingText } from './scoring';
import type { GameState, MemeEventId } from './types';

const ORIGINAL_EVENTS: MemeEventId[] = [
  'rug_pull',
  'irs',
  'lemonade_spill',
  'knife',
  'dancing',
  'market_crash',
  'bull_run',
];

const NEW_EVENTS: MemeEventId[] = [
  'airdrop_bait',
  'diamond_hands',
  'paper_hands',
  'influencer_call',
  'liquidity_added',
];

const ALL_RANDOM_EVENTS: MemeEventId[] = [...ORIGINAL_EVENTS, ...NEW_EVENTS];

const EVENT_META: Record<MemeEventId, { label: string; durationMs: number }> = {
  rug_pull: { label: 'RUG PULL!!!', durationMs: 1200 },
  irs: { label: 'SEC INVESTIGATION', durationMs: 6000 },
  lemonade_spill: { label: 'LIQUIDITY VACUUM', durationMs: 4000 },
  knife: { label: 'WHALE DUMP', durationMs: 800 },
  dancing: { label: 'CT PUMP POST', durationMs: 3000 },
  market_crash: { label: 'MARKET CRASH -50%', durationMs: 3500 },
  bull_run: { label: 'NUMBER GO UP', durationMs: 5000 },
  welcome_road: { label: 'WELCOME TO THE ROAD', durationMs: 1500 },
  airdrop_bait: { label: 'FAKE AIRDROP', durationMs: 2500 },
  diamond_hands: { label: 'DIAMOND HANDS', durationMs: 3000 },
  paper_hands: { label: 'PAPER HANDS', durationMs: 3500 },
  influencer_call: { label: 'THIS IS THE NEXT 100X', durationMs: 4500 },
  liquidity_added: { label: 'LP ADDED', durationMs: 4000 },
};

let collectibleId = 1;

function pickRandomEvent(): MemeEventId {
  return ALL_RANDOM_EVENTS[Math.floor(Math.random() * ALL_RANDOM_EVENTS.length)];
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

function spawnAirdrop(state: GameState): void {
  const spawnY = getLeadingRoadSegment(state.road)?.y ?? 0;
  const x = randomXOnRoad(state.road, spawnY, state.width);
  state.collectibles.push({
    id: collectibleId++,
    kind: 'airdrop_bait',
    x,
    y: -48,
    w: 52,
    h: 52,
    active: true,
  });
}

export function startEvent(state: GameState, id: MemeEventId, now: number): void {
  const meta = EVENT_META[id];
  const endsAt = now + meta.durationMs / 1000;

  state.activeEvent = { id, label: meta.label, endsAt, startedAt: now };
  const f = state.flags;

  switch (id) {
    case 'welcome_road':
      break;
    case 'rug_pull':
      f.rugBurning = true;
      f.screenShake = 6;
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
      f.screenShake = 8;
      break;
    case 'bull_run':
      f.bullRunUntil = endsAt;
      f.scrollMultiplier = 2;
      f.greenTint = 1;
      break;
    case 'airdrop_bait':
      spawnAirdrop(state);
      break;
    case 'diamond_hands':
      f.inputMult = 0.65;
      f.frictionMult = 0.82;
      f.scoreMultiplier = 1.5;
      break;
    case 'paper_hands':
      f.inputMult = 1.8;
      f.wobbleMult = 3;
      break;
    case 'influencer_call':
      f.influencerPopupUntil = endsAt;
      f.scrollMultiplier = 1.6;
      f.greenTint = 1;
      break;
    case 'liquidity_added':
      f.roadWidthMult = 1.35;
      break;
  }
}

export function updateCollectibles(state: GameState, scrollDelta: number): void {
  const lemon = state.lemon;
  const lemonY = state.lemonScreenY;

  for (const c of state.collectibles) {
    if (!c.active) continue;
    c.y += scrollDelta * 1.05;

    const overlap =
      Math.abs(c.x - lemon.x) < c.w / 2 + LEMON_RADIUS - 4 &&
      Math.abs(c.y - lemonY) < c.h / 2 + LEMON_RADIUS - 4;

    if (overlap) {
      c.active = false;
      const dir = Math.random() > 0.5 ? 1 : -1;
      lemon.vx += dir * 12;
      lemon.x += dir * 18;
      state.flags.screenShake = Math.max(state.flags.screenShake, 7);
      state.flags.claimFailedUntil = state.time + 1.2;
      spawnFloatingText(state, 'CLAIM FAILED', lemon.x, lemonY - 50, '#FF1744');
    }
  }

  state.collectibles = state.collectibles.filter(
    (c) => c.active && c.y < state.height + 80,
  );
}

export function updateActiveEvent(state: GameState, now: number, dt: number): void {
  const ev = state.activeEvent;
  if (!ev) return;

  if (now >= ev.endsAt) {
    if (ev.id === 'market_crash' && state.phase === 'playing') {
      awardLemonHands(state, state.lemon.x, state.lemonScreenY);
    }
    if (state.phase === 'playing') {
      const count = (state.runSession.survivedEvents[ev.id] ?? 0) + 1;
      state.runSession.survivedEvents[ev.id] = count;
      if (ev.id === 'knife') {
        state.runSession.whaleEventSurvivals += 1;
      }
    }
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
    state.flags.screenShake = 4 + Math.random() * 3;
    if (Math.random() < 0.06) {
      state.lemon.vx += (Math.random() - 0.5) * (5 + state.difficulty * 1.5);
      state.lemonSquash = Math.min(state.lemonSquash, 0.8);
    }
  }

  if (ev.id === 'rug_pull') {
    state.flags.screenShake = 3 + Math.random() * 2;
  }

  if (ev.id === 'influencer_call') {
    const elapsed = now - ev.startedAt;
    if (elapsed >= 3 && elapsed < 4.5) {
      state.flags.screenShake = 5 + Math.random() * 4;
      if (Math.random() < 0.08) {
        state.lemon.vx += (Math.random() - 0.5) * 8;
      }
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
      f.screenShake = 0;
      break;
    case 'knife':
      f.knifeSlashUntil = 0;
      break;
    case 'diamond_hands':
      f.inputMult = 1;
      f.frictionMult = 1;
      f.scoreMultiplier = 1;
      break;
    case 'paper_hands':
      f.inputMult = 1;
      f.wobbleMult = 1;
      break;
    case 'influencer_call':
      f.scrollMultiplier = 1;
      f.greenTint = 0;
      f.influencerPopupUntil = 0;
      break;
    case 'liquidity_added':
      f.roadWidthMult = 1;
      break;
    case 'welcome_road':
    case 'airdrop_bait':
      break;
  }
}

export function triggerWelcomeBanner(state: GameState, now: number): void {
  state.phaseBanner = { label: 'WELCOME TO THE ROAD', until: now + 1.5 };
}
