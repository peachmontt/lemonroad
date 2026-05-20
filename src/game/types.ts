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
}

export type MemeEventId =
  | 'rug_pull'
  | 'irs'
  | 'lemonade_spill'
  | 'knife'
  | 'dancing'
  | 'market_crash'
  | 'bull_run';

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

export interface GameFlags {
  scrollPaused: boolean;
  scrollMultiplier: number;
  slippery: boolean;
  screenShake: number;
  greenTint: number;
  freezeUntil: number;
  /** Stays true after rug pull until a new run starts */
  rugBurning: boolean;
  knifeSlashUntil: number;
  dancingUntil: number;
  bullRunUntil: number;
  marketCrashUntil: number;
  lemonadeUntil: number;
}

export interface ActiveEvent {
  id: MemeEventId;
  label: string;
  endsAt: number;
}

export interface GameState {
  phase: GamePhase;
  time: number;
  distance: number;
  scrollSpeed: number;
  difficulty: number;
  road: RoadSegment[];
  lemon: LemonState;
  hazards: Hazard[];
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
}

export interface GameSnapshot {
  phase: GamePhase;
  distance: number;
  juiceLevel: string;
  citricVelocity: number;
  activeEventLabel: string | null;
  muted: boolean;
}

export interface InputState {
  target: number;
  smoothed: number;
  keys: { left: boolean; right: boolean };
  touchX: number | null;
  tiltX: number;
  tiltGranted: boolean;
}
