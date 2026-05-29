import { checkBadgeUnlocks, checkDeathTitleUnlocks, getDeathTitleDefinition } from './badges';
import {
  completeMission,
  countCompletedMissions,
  getActiveDailyMissions,
  updateMissionProgress,
  type DailyMission,
} from './missions';
import { generateReferralCode } from './referrals';
import { checkSkinUnlocks, type SkinId } from './skins';
import type { HazardKind, MemeEventId, RunSummary } from './types';
import {
  createWeeklyCupState,
  ensureWeeklyCup,
  getLocalDateString,
  updateWeeklyCupAfterRun,
  type WeeklyCupState,
} from './weeklyCup';
import type { BadgeId, DeathTitleId } from './badges';

const STORAGE_KEY = 'lemonroad_progress_v1';

export interface PlayerProgress {
  unlockedSkins: SkinId[];
  selectedSkin: SkinId;
  unlockedBadges: BadgeId[];
  unlockedDeathTitles: DeathTitleId[];
  selectedDeathTitle: DeathTitleId | null;
  completedMissions: string[];
  activeDailyMissions: DailyMission[];
  streakDays: number;
  lastPlayDate: string | null;
  playDates: string[];
  dailyRunsDate: string | null;
  dailyRunsCount: number;
  referralCode: string;
  referralCount: number;
  lemonXp: number;
  totalRuns: number;
  bestDistance: number;
  totalDistance: number;
  deathsUnder100m: number;
  eventSurvivalCounts: Partial<Record<MemeEventId, number>>;
  hazardDodgeCounts: Partial<Record<HazardKind, number>>;
  deathsByCause: Partial<Record<string, number>>;
  weeklyCup: WeeklyCupState;
  customDeathPhraseUnlocked: boolean;
  referralLeaderboardBadge: boolean;
}

export interface UnlockNotification {
  kind: 'skin' | 'badge' | 'title';
  id: string;
  label: string;
  emoji: string;
}

function defaultProgress(): PlayerProgress {
  return {
    unlockedSkins: ['default'],
    selectedSkin: 'default',
    unlockedBadges: [],
    unlockedDeathTitles: [],
    selectedDeathTitle: null,
    completedMissions: [],
    activeDailyMissions: getActiveDailyMissions(undefined),
    streakDays: 0,
    lastPlayDate: null,
    playDates: [],
    dailyRunsDate: null,
    dailyRunsCount: 0,
    referralCode: generateReferralCode(),
    referralCount: 0,
    lemonXp: 0,
    totalRuns: 0,
    bestDistance: 0,
    totalDistance: 0,
    deathsUnder100m: 0,
    eventSurvivalCounts: {},
    hazardDodgeCounts: {},
    deathsByCause: {},
    weeklyCup: createWeeklyCupState(),
    customDeathPhraseUnlocked: false,
    referralLeaderboardBadge: false,
  };
}

function mergeProgress(raw: Partial<PlayerProgress>): PlayerProgress {
  const base = defaultProgress();
  const merged: PlayerProgress = {
    ...base,
    ...raw,
    unlockedSkins: (raw.unlockedSkins as SkinId[]) ?? base.unlockedSkins,
    weeklyCup: { ...base.weeklyCup, ...raw.weeklyCup },
    activeDailyMissions: getActiveDailyMissions(raw.activeDailyMissions),
  };
  if (!merged.unlockedSkins.includes('default')) {
    merged.unlockedSkins.unshift('default');
  }
  if (!merged.referralCode) {
    merged.referralCode = generateReferralCode();
  }
  merged.weeklyCup = ensureWeeklyCup(merged.weeklyCup);
  return merged;
}

export function getProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return mergeProgress(JSON.parse(raw) as Partial<PlayerProgress>);
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function unlockSkin(id: SkinId): PlayerProgress {
  const p = getProgress();
  if (!p.unlockedSkins.includes(id)) {
    p.unlockedSkins.push(id);
    saveProgress(p);
  }
  return p;
}

export function selectSkin(id: SkinId): PlayerProgress {
  const p = getProgress();
  if (p.unlockedSkins.includes(id)) {
    p.selectedSkin = id;
    saveProgress(p);
  }
  return p;
}

export function unlockBadge(id: BadgeId): PlayerProgress {
  const p = getProgress();
  if (!p.unlockedBadges.includes(id)) {
    p.unlockedBadges.push(id);
    saveProgress(p);
  }
  return p;
}

export function unlockDeathTitle(id: DeathTitleId): PlayerProgress {
  const p = getProgress();
  if (!p.unlockedDeathTitles.includes(id)) {
    p.unlockedDeathTitles.push(id);
    saveProgress(p);
  }
  return p;
}

export function selectDeathTitle(id: DeathTitleId | null): PlayerProgress {
  const p = getProgress();
  if (id === null || p.unlockedDeathTitles.includes(id)) {
    p.selectedDeathTitle = id;
    saveProgress(p);
  }
  return p;
}

export function completeMissionById(missionId: string): {
  progress: PlayerProgress;
  xpAwarded: number;
} {
  const p = getProgress();
  const { missions, xpAwarded } = completeMission(p.activeDailyMissions, missionId);
  p.activeDailyMissions = missions;
  if (missions.find((m) => m.id === missionId)?.claimed) {
    if (!p.completedMissions.includes(missionId)) {
      p.completedMissions.push(missionId);
    }
  }
  p.lemonXp += xpAwarded;
  saveProgress(p);
  return { progress: p, xpAwarded };
}

function updateStreak(p: PlayerProgress, today: string): void {
  if (p.lastPlayDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (p.lastPlayDate === yesterdayStr) {
    p.streakDays += 1;
  } else if (p.lastPlayDate !== today) {
    p.streakDays = 1;
  }
  p.lastPlayDate = today;
  p.playDates.push(today);
  if (p.playDates.length > 100) p.playDates = p.playDates.slice(-100);
}

function mergeEventCounts(
  target: Partial<Record<MemeEventId, number>>,
  source: Partial<Record<MemeEventId, number>>,
): void {
  for (const [k, v] of Object.entries(source)) {
    const key = k as MemeEventId;
    target[key] = (target[key] ?? 0) + (v ?? 0);
  }
}

function mergeHazardCounts(
  target: Partial<Record<HazardKind, number>>,
  source: Partial<Record<HazardKind, number>>,
): void {
  for (const [k, v] of Object.entries(source)) {
    const key = k as HazardKind;
    target[key] = (target[key] ?? 0) + (v ?? 0);
  }
}

export function updateProgressAfterRun(summary: RunSummary): {
  progress: PlayerProgress;
  unlocks: UnlockNotification[];
} {
  const p = getProgress();
  const today = getLocalDateString();
  const unlocks: UnlockNotification[] = [];

  updateStreak(p, today);

  p.totalRuns += 1;
  p.totalDistance += summary.distance;
  p.bestDistance = Math.max(p.bestDistance, summary.distance);
  if (summary.distance < 100) p.deathsUnder100m += 1;

  mergeEventCounts(p.eventSurvivalCounts, summary.survivedEvents);
  mergeHazardCounts(p.hazardDodgeCounts, summary.hazardDodges);

  const deathKey =
    summary.activeEventAtDeath === 'rug_pull'
      ? 'rug_pull'
      : summary.lastHazardHit ?? summary.deathCause;
  p.deathsByCause[deathKey] = (p.deathsByCause[deathKey] ?? 0) + 1;

  p.weeklyCup = updateWeeklyCupAfterRun(p.weeklyCup, summary.distance);

  if (p.dailyRunsDate !== today) {
    p.dailyRunsDate = today;
    p.dailyRunsCount = 0;
  }
  p.dailyRunsCount += 1;
  const runsToday = p.dailyRunsCount;

  p.activeDailyMissions = updateMissionProgress(p.activeDailyMissions, {
    summary,
    runsToday,
    hits300Today: summary.distance >= 300 ? 1 : 0,
  });

  p.lemonXp += Math.floor(summary.distance / 50);

  if (p.referralCount >= 5) p.customDeathPhraseUnlocked = true;
  if (p.referralCount >= 10) p.referralLeaderboardBadge = true;

  for (const skinId of checkSkinUnlocks(p)) {
    p.unlockedSkins.push(skinId);
    const skin = skinId;
    unlocks.push({
      kind: 'skin',
      id: skin,
      label: skin.replace(/_/g, ' '),
      emoji: '🍋',
    });
  }

  for (const badgeId of checkBadgeUnlocks(p, summary)) {
    p.unlockedBadges.push(badgeId);
    unlocks.push({ kind: 'badge', id: badgeId, label: badgeId.replace(/_/g, ' '), emoji: '🏅' });
  }

  for (const titleId of checkDeathTitleUnlocks(p, summary)) {
    p.unlockedDeathTitles.push(titleId);
    const def = getDeathTitleDefinition(titleId);
    unlocks.push({
      kind: 'title',
      id: titleId,
      label: def?.name ?? titleId,
      emoji: def?.emoji ?? '💀',
    });
  }

  if (p.streakDays >= 3 && !p.unlockedBadges.includes('daily_squeezer')) {
    p.unlockedBadges.push('daily_squeezer');
    unlocks.push({
      kind: 'badge',
      id: 'daily_squeezer',
      label: 'Daily Squeezer',
      emoji: '🔥',
    });
  }

  if (countCompletedMissions(p.activeDailyMissions) >= 5 && !p.unlockedSkins.includes('golden')) {
    if (p.referralCount < 3) {
      p.unlockedSkins.push('golden');
      unlocks.push({ kind: 'skin', id: 'golden', label: 'Golden Lemon', emoji: '✨' });
    }
  }

  saveProgress(p);
  return { progress: p, unlocks };
}

export function incrementReferralCountDev(): PlayerProgress {
  if (!import.meta.env.DEV) return getProgress();
  const p = getProgress();
  p.referralCount += 1;
  if (p.referralCount >= 3 && !p.unlockedSkins.includes('golden')) {
    p.unlockedSkins.push('golden');
  }
  if (p.referralCount >= 5) p.customDeathPhraseUnlocked = true;
  if (p.referralCount >= 10) p.referralLeaderboardBadge = true;
  saveProgress(p);
  return p;
}

export function applyServerReferralStats(stats: {
  code: string;
  qualifiedCount: number;
}): PlayerProgress {
  const p = getProgress();
  p.referralCode = stats.code;
  p.referralCount = stats.qualifiedCount;
  if (p.referralCount >= 3 && !p.unlockedSkins.includes('golden')) {
    p.unlockedSkins.push('golden');
  }
  if (p.referralCount >= 5) p.customDeathPhraseUnlocked = true;
  if (p.referralCount >= 10) p.referralLeaderboardBadge = true;
  saveProgress(p);
  return p;
}

export { getActiveDailyMissions };
