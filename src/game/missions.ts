import type { RunSummary } from './types';
import { getLocalDateString } from './weeklyCup';

export type MissionRewardType = 'lemon_xp' | 'badge' | 'title' | 'skin_progress';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardType: MissionRewardType;
  rewardId: string;
  rewardLabel: string;
  completed: boolean;
  claimed: boolean;
  date: string;
  metric: MissionMetric;
}

export type MissionMetric =
  | 'powell_survive'
  | 'whale_dodge'
  | 'distance_500'
  | 'runs_3'
  | 'distance_300_twice'
  | 'market_crash_survive'
  | 'rug_deaths_2'
  | 'distance_700'
  | 'runs_5';

interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardType: MissionRewardType;
  rewardId: string;
  rewardLabel: string;
  metric: MissionMetric;
}

const MISSION_POOL: MissionTemplate[] = [
  {
    id: 'powell_3',
    title: 'Powell Survivor',
    description: 'Survive 3 Powell Speeches',
    target: 3,
    rewardType: 'lemon_xp',
    rewardId: 'xp_50',
    rewardLabel: '50 Lemon XP',
    metric: 'powell_survive',
  },
  {
    id: 'whale_5',
    title: 'Whale Dodger',
    description: 'Dodge 5 Whale Dumps',
    target: 5,
    rewardType: 'skin_progress',
    rewardId: 'whale_bait',
    rewardLabel: 'Whale Bait progress',
    metric: 'whale_dodge',
  },
  {
    id: 'dist_500',
    title: 'Half K',
    description: 'Reach 500m without leaving the road',
    target: 500,
    rewardType: 'lemon_xp',
    rewardId: 'xp_75',
    rewardLabel: '75 Lemon XP',
    metric: 'distance_500',
  },
  {
    id: 'runs_3',
    title: 'Triple Squeeze',
    description: 'Play 3 runs',
    target: 3,
    rewardType: 'lemon_xp',
    rewardId: 'xp_30',
    rewardLabel: '30 Lemon XP',
    metric: 'runs_3',
  },
  {
    id: 'dist_300x2',
    title: 'Double Dip',
    description: 'Reach 300m twice',
    target: 2,
    rewardType: 'lemon_xp',
    rewardId: 'xp_40',
    rewardLabel: '40 Lemon XP',
    metric: 'distance_300_twice',
  },
  {
    id: 'crash_1',
    title: 'Crash Test',
    description: 'Survive one Market Crash',
    target: 1,
    rewardType: 'lemon_xp',
    rewardId: 'xp_25',
    rewardLabel: '25 Lemon XP',
    metric: 'market_crash_survive',
  },
  {
    id: 'rug_2',
    title: 'Rug Collector',
    description: 'Get rugged 2 times',
    target: 2,
    rewardType: 'title',
    rewardId: 'rug_survivor',
    rewardLabel: 'Rug Survivor title progress',
    metric: 'rug_deaths_2',
  },
  {
    id: 'dist_700',
    title: '700 Club',
    description: 'Reach 700m',
    target: 700,
    rewardType: 'lemon_xp',
    rewardId: 'xp_100',
    rewardLabel: '100 Lemon XP',
    metric: 'distance_700',
  },
  {
    id: 'runs_5',
    title: 'Grind Mode',
    description: 'Complete 5 runs',
    target: 5,
    rewardType: 'badge',
    rewardId: 'daily_grinder',
    rewardLabel: 'Daily Grinder progress',
    metric: 'runs_5',
  },
];

function hashDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pickMissionsForDate(date: string): DailyMission[] {
  const h = hashDate(date);
  const indices: number[] = [];
  for (let i = 0; i < MISSION_POOL.length && indices.length < 3; i++) {
    const idx = (h + i * 7) % MISSION_POOL.length;
    if (!indices.includes(idx)) indices.push(idx);
  }
  while (indices.length < 3) {
    const idx = (h + indices.length * 13) % MISSION_POOL.length;
    if (!indices.includes(idx)) indices.push(idx);
  }

  return indices.map((idx) => {
    const t = MISSION_POOL[idx];
    return {
      ...t,
      progress: 0,
      completed: false,
      claimed: false,
      date,
    };
  });
}

export function getActiveDailyMissions(
  stored: DailyMission[] | undefined,
  date = getLocalDateString(),
): DailyMission[] {
  if (!stored || stored.length === 0 || stored[0]?.date !== date) {
    return pickMissionsForDate(date);
  }
  return stored;
}

export interface MissionRunContext {
  summary: RunSummary;
  runsToday: number;
  hits300Today: number;
}

function metricProgress(m: DailyMission, ctx: MissionRunContext): number {
  const { summary } = ctx;
  switch (m.metric) {
    case 'powell_survive':
      return summary.hazardDodges['powell_speech'] ?? 0;
    case 'whale_dodge':
      return summary.whaleEventSurvivals;
    case 'distance_500':
      return summary.distance >= 500 ? 500 : Math.floor(summary.distance);
    case 'runs_3':
    case 'runs_5':
      return ctx.runsToday;
    case 'distance_300_twice':
      return ctx.hits300Today;
    case 'market_crash_survive':
      return summary.survivedEvents['market_crash'] ?? 0;
    case 'rug_deaths_2':
      return summary.activeEventAtDeath === 'rug_pull' ? 1 : 0;
    case 'distance_700':
      return summary.distance >= 700 ? 700 : Math.floor(summary.distance);
    default:
      return 0;
  }
}

export function updateMissionProgress(
  missions: DailyMission[],
  ctx: MissionRunContext,
  date = getLocalDateString(),
): DailyMission[] {
  const active = getActiveDailyMissions(missions, date);
  return active.map((m) => {
    if (m.claimed) return m;
    const increment = metricProgress(m, ctx);
    let progress = m.progress;
    if (m.metric === 'distance_500' || m.metric === 'distance_700') {
      progress = Math.max(m.progress, increment);
    } else if (m.metric === 'distance_300_twice') {
      progress = m.progress + (ctx.summary.distance >= 300 ? 1 : 0);
    } else if (m.metric === 'runs_3' || m.metric === 'runs_5') {
      progress = ctx.runsToday;
    } else {
      progress = m.progress + increment;
    }
    const completed = progress >= m.target;
    return { ...m, progress: Math.min(progress, m.target), completed };
  });
}

export function completeMission(
  missions: DailyMission[],
  missionId: string,
): { missions: DailyMission[]; xpAwarded: number } {
  let xpAwarded = 0;
  const updated = missions.map((m) => {
    if (m.id !== missionId || !m.completed || m.claimed) return m;
    if (m.rewardType === 'lemon_xp') {
      const match = m.rewardId.match(/xp_(\d+)/);
      xpAwarded = match ? parseInt(match[1], 10) : 25;
    }
    return { ...m, claimed: true };
  });
  return { missions: updated, xpAwarded };
}

export function countCompletedMissions(missions: DailyMission[]): number {
  return missions.filter((m) => m.claimed).length;
}

export function countRunsToday(
  dailyRunsDate: string | null,
  dailyRunsCount: number,
  date = getLocalDateString(),
): number {
  return dailyRunsDate === date ? dailyRunsCount : 0;
}
