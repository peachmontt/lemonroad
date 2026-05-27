import type { PlayerProgress } from './progression';

export type SkinId =
  | 'default'
  | 'golden'
  | 'burnt'
  | 'diamond_hands'
  | 'rugged'
  | 'whale_bait';

export interface SkinDefinition {
  id: SkinId;
  name: string;
  emoji: string;
  description: string;
  unlockHint: string;
}

export const SKINS: SkinDefinition[] = [
  {
    id: 'default',
    name: 'Default Lemon',
    emoji: '🍋',
    description: 'Classic citrus. Zero drip.',
    unlockHint: 'Unlocked by default',
  },
  {
    id: 'golden',
    name: 'Golden Lemon',
    emoji: '✨',
    description: 'Shiny enough to blind a degen.',
    unlockHint: 'Invite 3 friends OR complete 5 daily missions',
  },
  {
    id: 'burnt',
    name: 'Burnt Lemon',
    emoji: '🔥',
    description: 'Charred by rug pulls.',
    unlockHint: 'Die from Rug Pull 3 times',
  },
  {
    id: 'diamond_hands',
    name: 'Diamond Hands Lemon',
    emoji: '💎',
    description: 'Blue shine. Unreasonable conviction.',
    unlockHint: 'Survive 3 Bull Run events',
  },
  {
    id: 'rugged',
    name: 'Rugged Lemon',
    emoji: '🩹',
    description: 'Bandaged. Battle-tested.',
    unlockHint: 'Die 10 times total',
  },
  {
    id: 'whale_bait',
    name: 'Whale Bait Lemon',
    emoji: '🐋',
    description: 'Purple hook energy.',
    unlockHint: 'Survive 5 Whale Dump events',
  },
];

export function getSkinDefinition(id: string): SkinDefinition | undefined {
  return SKINS.find((s) => s.id === id);
}

export function isSkinUnlocked(id: SkinId, progress: PlayerProgress): boolean {
  if (id === 'default') return true;
  return progress.unlockedSkins.includes(id);
}

export function checkSkinUnlocks(progress: PlayerProgress): SkinId[] {
  const unlocked: SkinId[] = [];
  const rugDeaths = progress.deathsByCause['rug_pull'] ?? 0;
  const bullSurvivals = progress.eventSurvivalCounts['bull_run'] ?? 0;
  const whaleSurvivals = progress.eventSurvivalCounts['knife'] ?? 0;
  const completedMissions = progress.completedMissions.length;

  if (
    (progress.referralCount >= 3 || completedMissions >= 5) &&
    !progress.unlockedSkins.includes('golden')
  ) {
    unlocked.push('golden');
  }
  if (rugDeaths >= 3 && !progress.unlockedSkins.includes('burnt')) {
    unlocked.push('burnt');
  }
  if (bullSurvivals >= 3 && !progress.unlockedSkins.includes('diamond_hands')) {
    unlocked.push('diamond_hands');
  }
  if (progress.totalRuns >= 10 && !progress.unlockedSkins.includes('rugged')) {
    unlocked.push('rugged');
  }
  if (whaleSurvivals >= 5 && !progress.unlockedSkins.includes('whale_bait')) {
    unlocked.push('whale_bait');
  }

  return unlocked;
}
