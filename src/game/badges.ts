import type { PlayerProgress } from './progression';
import type { RunSummary } from './types';

export type BadgeId =
  | 'first_rug'
  | '500m_club'
  | '1000m_degen'
  | 'powell_proof'
  | 'whale_dodger'
  | 'daily_grinder'
  | 'weekly_cup_participant'
  | 'top_50_candidate'
  | 'daily_squeezer';

export type DeathTitleId =
  | 'exit_liquidity'
  | 'rug_survivor'
  | 'powell_victim'
  | 'certified_degen'
  | 'lemon_down_bad'
  | 'whale_snack'
  | 'cpi_casualty'
  | 'diamond_hands_intern';

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  emoji: string;
  description: string;
  unlockHint: string;
}

export interface DeathTitleDefinition {
  id: DeathTitleId;
  name: string;
  emoji: string;
  unlockHint: string;
}

export const BADGES: BadgeDefinition[] = [
  {
    id: 'first_rug',
    name: 'First Rug',
    emoji: '🪤',
    description: 'Got rugged for the first time.',
    unlockHint: 'First death during Rug Pull',
  },
  {
    id: '500m_club',
    name: '500m Club',
    emoji: '🛣️',
    description: 'Made it halfway to nowhere.',
    unlockHint: 'Reach 500m',
  },
  {
    id: '1000m_degen',
    name: '1000m Degen',
    emoji: '🏁',
    description: 'Serious road time.',
    unlockHint: 'Reach 1000m',
  },
  {
    id: 'powell_proof',
    name: 'Powell Proof',
    emoji: '🎤',
    description: 'Survived the speech.',
    unlockHint: 'Survive 3 Powell Speech events',
  },
  {
    id: 'whale_dodger',
    name: 'Whale Dodger',
    emoji: '🐋',
    description: 'Whale dumps? Not today.',
    unlockHint: 'Dodge/survive 5 Whale Dumps',
  },
  {
    id: 'daily_grinder',
    name: 'Daily Grinder',
    emoji: '☕',
    description: 'Mission machine.',
    unlockHint: 'Complete 7 daily missions',
  },
  {
    id: 'weekly_cup_participant',
    name: 'Weekly Cup Participant',
    emoji: '🏆',
    description: 'Showed up for the cup.',
    unlockHint: 'Play 1 run during current weekly tournament',
  },
  {
    id: 'top_50_candidate',
    name: 'Top 50 Candidate',
    emoji: '🎯',
    description: 'Leaderboard hopeful.',
    unlockHint: 'Qualify for top 50 when backend exists',
  },
  {
    id: 'daily_squeezer',
    name: 'Daily Squeezer',
    emoji: '🔥',
    description: '3-day streak unlocked.',
    unlockHint: '3-day play streak',
  },
];

export const DEATH_TITLES: DeathTitleDefinition[] = [
  { id: 'exit_liquidity', name: 'Exit Liquidity', emoji: '💸', unlockHint: 'Die 5 times' },
  { id: 'rug_survivor', name: 'Rug Survivor', emoji: '🪤', unlockHint: 'Survive Rug Pull once' },
  { id: 'powell_victim', name: 'Powell Victim', emoji: '🎤', unlockHint: 'Die after Powell Speech' },
  { id: 'certified_degen', name: 'Certified Degen', emoji: '📜', unlockHint: '25 total runs' },
  { id: 'lemon_down_bad', name: 'Lemon Down Bad', emoji: '📉', unlockHint: 'Fail under 100m five times' },
  { id: 'whale_snack', name: 'Whale Snack', emoji: '🐋', unlockHint: 'Die during Whale Dump' },
  { id: 'cpi_casualty', name: 'CPI Casualty', emoji: '📊', unlockHint: 'Die after CPI hazard' },
  {
    id: 'diamond_hands_intern',
    name: 'Diamond Hands Intern',
    emoji: '💎',
    unlockHint: 'Survive 3 Bull Run events',
  },
];

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}

export function getDeathTitleDefinition(id: string): DeathTitleDefinition | undefined {
  return DEATH_TITLES.find((t) => t.id === id);
}

export function checkBadgeUnlocks(
  progress: PlayerProgress,
  summary?: RunSummary,
): BadgeId[] {
  const unlocked: BadgeId[] = [];

  if (
    summary?.activeEventAtDeath === 'rug_pull' &&
    !progress.unlockedBadges.includes('first_rug')
  ) {
    unlocked.push('first_rug');
  }
  if (progress.bestDistance >= 500 && !progress.unlockedBadges.includes('500m_club')) {
    unlocked.push('500m_club');
  }
  if (progress.bestDistance >= 1000 && !progress.unlockedBadges.includes('1000m_degen')) {
    unlocked.push('1000m_degen');
  }
  if (
    (progress.hazardDodgeCounts['powell_speech'] ?? 0) >= 3 &&
    !progress.unlockedBadges.includes('powell_proof')
  ) {
    unlocked.push('powell_proof');
  }
  if (
    (progress.eventSurvivalCounts['knife'] ?? 0) >= 5 &&
    !progress.unlockedBadges.includes('whale_dodger')
  ) {
    unlocked.push('whale_dodger');
  }
  if (
    progress.completedMissions.length >= 7 &&
    !progress.unlockedBadges.includes('daily_grinder')
  ) {
    unlocked.push('daily_grinder');
  }
  if (
    progress.weeklyCup.runsThisWeek >= 1 &&
    !progress.unlockedBadges.includes('weekly_cup_participant')
  ) {
    unlocked.push('weekly_cup_participant');
  }
  if (progress.streakDays >= 3 && !progress.unlockedBadges.includes('daily_squeezer')) {
    unlocked.push('daily_squeezer');
  }

  return unlocked;
}

export function checkDeathTitleUnlocks(
  progress: PlayerProgress,
  summary?: RunSummary,
): DeathTitleId[] {
  const unlocked: DeathTitleId[] = [];
  const shortFails = progress.deathsUnder100m ?? 0;

  if (progress.totalRuns >= 5 && !progress.unlockedDeathTitles.includes('exit_liquidity')) {
    unlocked.push('exit_liquidity');
  }
  if (
    (progress.eventSurvivalCounts['rug_pull'] ?? 0) >= 1 &&
    !progress.unlockedDeathTitles.includes('rug_survivor')
  ) {
    unlocked.push('rug_survivor');
  }
  if (
    summary?.lastHazardHit === 'powell_speech' &&
    !progress.unlockedDeathTitles.includes('powell_victim')
  ) {
    unlocked.push('powell_victim');
  }
  if (progress.totalRuns >= 25 && !progress.unlockedDeathTitles.includes('certified_degen')) {
    unlocked.push('certified_degen');
  }
  if (shortFails >= 5 && !progress.unlockedDeathTitles.includes('lemon_down_bad')) {
    unlocked.push('lemon_down_bad');
  }
  if (
    summary?.activeEventAtDeath === 'knife' &&
    !progress.unlockedDeathTitles.includes('whale_snack')
  ) {
    unlocked.push('whale_snack');
  }
  if (
    summary?.lastHazardHit === 'monthly_inflation' &&
    !progress.unlockedDeathTitles.includes('cpi_casualty')
  ) {
    unlocked.push('cpi_casualty');
  }
  if (
    (progress.eventSurvivalCounts['bull_run'] ?? 0) >= 3 &&
    !progress.unlockedDeathTitles.includes('diamond_hands_intern')
  ) {
    unlocked.push('diamond_hands_intern');
  }

  return unlocked;
}
