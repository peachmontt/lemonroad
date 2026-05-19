export const LEMON_RADIUS = 22;
export const ROAD_START_WIDTH = 220;
export const ROAD_MIN_WIDTH = 100;
export const SEGMENT_SPACING = 8;
export const BASE_SCROLL_SPEED = 10;
export const MAX_SCROLL_SPEED = 26;
export const SCROLL_VISUAL_MULT = 10;
export const LEMON_SCREEN_Y_RATIO = 0.72;
export const OFF_ROAD_DEATH_FRAMES = 8;   // ~130 ms grace at 60 fps
export const COLLISION_MARGIN = 6;
export const MAX_PLAYFIELD_WIDTH = 520;

/** Road width — uses most of the playfield so it reads well on desktop */
export function getRoadStartWidth(canvasWidth: number): number {
  const cap = Math.min(canvasWidth * 0.88, 480);
  if (canvasWidth >= 500) return Math.max(320, cap);
  if (canvasWidth >= 400) return Math.max(280, canvasWidth * 0.82);
  return Math.max(ROAD_START_WIDTH, canvasWidth * 0.78);
}

export function getRoadMinWidth(canvasWidth: number): number {
  return Math.max(ROAD_MIN_WIDTH, getRoadStartWidth(canvasWidth) * 0.42);
}

export const COLORS = {
  grass: '#7CFC00',
  grassDark: '#5cb85c',
  road: '#4a4a4a',
  roadEdge: '#e8e8e8',
  roadLine: '#FFFF00',
  outline: '#000000',
  lemon: '#FFE135',
  lemonDark: '#E6C200',
  void: '#1a0a2e',
  puddle: '#4FC3F7',
  taxman: '#222222',
  suit: '#333333',
  tie: '#CC0000',
  candleGreen: '#00C853',
  candleRed: '#FF1744',
  cpiOrange: '#FF9800',
  fedBlue: '#1565C0',
  fedNavy: '#0D47A1',
  whalePurple: '#7B1FA2',
};
