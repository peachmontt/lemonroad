import type { BiomePhase } from './types';

export interface BiomeInfo {
  phase: BiomePhase;
  difficulty: number;
  banner: string | null;
  juiceLevel: string;
}

export function getBiome(distance: number): BiomeInfo {
  if (distance < 150) {
    return {
      phase: 'tutorial',
      difficulty: distance / 500,
      banner: null,
      juiceLevel: 'mild',
    };
  }
  if (distance < 400) {
    return {
      phase: 'market_opens',
      difficulty: 0.3 + (distance - 150) / 357,
      banner: 'MARKET OPENED',
      juiceLevel: 'unstable',
    };
  }
  if (distance < 800) {
    return {
      phase: 'volatility',
      difficulty: 0.8 + (distance - 400) / 444,
      banner: 'VOLATILITY INCOMING',
      juiceLevel: 'critical',
    };
  }
  if (distance < 1300) {
    return {
      phase: 'degen',
      difficulty: 1.8 + (distance - 800) / 500,
      banner: 'DEGEN MODE ACTIVATED',
      juiceLevel: 'catastrophic',
    };
  }
  return {
    phase: 'final_boss',
    difficulty: Math.min(3, 2.6 + (distance - 1300) / 500),
    banner: 'FINAL BOSS MARKET',
    juiceLevel: 'catastrophic',
  };
}
