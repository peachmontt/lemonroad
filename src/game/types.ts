export type GamePhase = 'idle' | 'playing' | 'dying' | 'dead';

export type HazardKind = 'short_squeeze' | 'monthly_inflation' | 'powell_speech';

export interface Hazard {
  id: number;
  kind: HazardKind;
  x: number;
  y: number;
  vy: number;
  w: number;
  h: number;
  life: number;
  passed: boolean;
}

export type MemeEventId =
  | 'rug_pull'
  | 'irs'
  | 'lemonade_spill'
  | 'knife'
  | 'dancing'
  | 'market_crash'
  | 'bull_run'
  | 'welcome_road'
  | 'airdrop_bait'
  | 'diamond_hands'
  | 'paper_hands'
  | 'influencer_call'
  | 'liquidity_added';

export interface RoadSegment {
  y: number;
  centerX: number;
  width: number;
  hasRoad: boolean;
}

export interface LemonState {
  x: number;
  vx: number;
  rotation: number;
  spinSpeed: number;
  scale: number;
  squashX: number;
}

export interface TaxmanState {
  active: boolean;
  x: number;
  y: number;
}

export interface Collectible {
  id: number;
  kind: 'airdrop_bait';
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export interface PhaseBanner {
  label: string;
  until: number;
}

export type BiomePhase =
  | 'tutorial'
  | 'market_opens'
  | 'volatility'
  | 'degen'
  | 'final_boss';

export interface GameFlags {
  scrollPaused: boolean;
  scrollMultiplier: number;
  slippery: boolean;
  screenShake: number;
  greenTint: number;
  freezeUntil: number;
  rugBurning: boolean;
  knifeSlashUntil: number;
  dancingUntil: number;
  bullRunUntil: number;
  marketCrashUntil: number;
  lemonadeUntil: number;
  inputMult: number;
  frictionMult: number;
  wobbleMult: number;
  roadWidthMult: number;
  scoreMultiplier: number;
  influencerPopupUntil: number;
  claimFailedUntil: number;
}

export interface ActiveEvent {
  id: MemeEventId;
  label: string;
  endsAt: number;
  startedAt: number;
}

export interface RunSessionStats {
  survivedEvents: Partial<Record<MemeEventId, number>>;
  hazardDodges: Partial<Record<HazardKind, number>>;
  whaleEventSurvivals: number;
  deathLastHazard: HazardKind | null;
  activeEventAtDeath: MemeEventId | null;
  deathCause: 'off_road' | 'no_road' | null;
  runEnded: boolean;
}

export function createRunSessionStats(): RunSessionStats {
  return {
    survivedEvents: {},
    hazardDodges: {},
    whaleEventSurvivals: 0,
    deathLastHazard: null,
    activeEventAtDeath: null,
    deathCause: null,
    runEnded: false,
  };
}

export interface RunSummary {
  id: string;
  date: string;
  distance: number;
  baseDistance: number;
  bonusScore: number;
  durationMs: number;
  deathCause: 'off_road' | 'no_road';
  activeEventAtDeath: MemeEventId | null;
  lastHazardHit: HazardKind | null;
  selectedSkin: string;
  deathTitle: string | null;
  survivedEvents: Partial<Record<MemeEventId, number>>;
  hazardDodges: Partial<Record<HazardKind, number>>;
  whaleEventSurvivals: number;
  wasClosestToRewardZone?: boolean;
  rankDeltaPlaceholder?: number;
}

export interface GameState {
  phase: GamePhase;
  time: number;
  distance: number;
  bonusScore: number;
  dodgeStreak: number;
  scrollSpeed: number;
  difficulty: number;
  biomePhase: BiomePhase;
  lastBiomePhase: BiomePhase | null;
  phaseBanner: PhaseBanner | null;
  welcomeShown: boolean;
  firstHazardEasy: boolean;
  road: RoadSegment[];
  lemon: LemonState;
  hazards: Hazard[];
  collectibles: Collectible[];
  floatingTexts: FloatingText[];
  nextHazardAt: number;
  lemonSquash: number;
  lemonSquashVel: number;
  lastHitKind: HazardKind | null;
  slipperyUntil: number;
  taxman: TaxmanState;
  flags: GameFlags;
  activeEvent: ActiveEvent | null;
  eventQueue: MemeEventId[];
  nextEventAt: number;
  offRoadFrames: number;
  deathTime: number;
  juiceLevel: string;
  citricVelocity: number;
  width: number;
  height: number;
  dpr: number;
  lemonScreenY: number;
  selectedSkinId: string;
  runSession: RunSessionStats;
  playStartedAt: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  distance: number;
  bonusScore: number;
  dodgeStreak: number;
  juiceLevel: string;
  citricVelocity: number;
  activeEventLabel: string | null;
  biomePhase: BiomePhase;
  muted: boolean;
}

export interface InputState {
  target: number;
  smoothed: number;
  keys: { left: boolean; right: boolean };
  dragX: number | null;
  isDragging: boolean;
  tiltX: number;
  tiltGranted: boolean;
}
