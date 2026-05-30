/** Placeholder rivals until real players out-earn them (3-month XP ladder). */
export interface TopLemonsNpcSeed {
  username: string;
  xpGainedLastThreeMonths: number;
  totalLemonXp: number;
}

/** Twenty NPC slots from 12,400 XP down — fills the board until beaten. */
export const TOP_LEMONS_NPC_SEED: readonly TopLemonsNpcSeed[] = [
  { username: 'LemonKing', xpGainedLastThreeMonths: 12400, totalLemonXp: 8300 },
  { username: 'RugDestroyer', xpGainedLastThreeMonths: 9800, totalLemonXp: 7200 },
  { username: 'SourRunner', xpGainedLastThreeMonths: 7600, totalLemonXp: 6100 },
  { username: 'Citronaut', xpGainedLastThreeMonths: 6900, totalLemonXp: 5400 },
  { username: 'PeelBandit', xpGainedLastThreeMonths: 6200, totalLemonXp: 4800 },
  { username: 'ZestWizard', xpGainedLastThreeMonths: 5800, totalLemonXp: 4200 },
  { username: 'PulpLord', xpGainedLastThreeMonths: 5100, totalLemonXp: 3900 },
  { username: 'AcidDrop', xpGainedLastThreeMonths: 4700, totalLemonXp: 3400 },
  { username: 'YellowLine', xpGainedLastThreeMonths: 4200, totalLemonXp: 3100 },
  { username: 'MemeSqueezer', xpGainedLastThreeMonths: 3900, totalLemonXp: 2800 },
  { username: 'JuiceLord', xpGainedLastThreeMonths: 3750, totalLemonXp: 2650 },
  { username: 'RugDodger', xpGainedLastThreeMonths: 3600, totalLemonXp: 2500 },
  { username: 'ChartWatcher', xpGainedLastThreeMonths: 3450, totalLemonXp: 2350 },
  { username: 'CTSurvivor', xpGainedLastThreeMonths: 3300, totalLemonXp: 2200 },
  { username: 'DipBuyer', xpGainedLastThreeMonths: 3150, totalLemonXp: 2050 },
  { username: 'WenLemon', xpGainedLastThreeMonths: 3000, totalLemonXp: 1900 },
  { username: 'PumpPeel', xpGainedLastThreeMonths: 2850, totalLemonXp: 1750 },
  { username: 'SoftHands', xpGainedLastThreeMonths: 2700, totalLemonXp: 1600 },
  { username: 'AlphaZest', xpGainedLastThreeMonths: 2550, totalLemonXp: 1450 },
  { username: 'MoonSqueeze', xpGainedLastThreeMonths: 2400, totalLemonXp: 1300 },
] as const;

export const TOP_LEMONS_NPC_COUNT = TOP_LEMONS_NPC_SEED.length;
