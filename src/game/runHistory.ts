import type { RunSummary } from './types';

const HISTORY_KEY = 'lemonroad_run_history_v1';
const MAX_RUNS = 50;

export interface HallOfShameCard {
  id: string;
  title: string;
  description: string;
  value: string;
}

function loadRuns(): RunSummary[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RunSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRuns(runs: RunSummary[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
  } catch {
    /* ignore */
  }
}

export function getRunHistory(): RunSummary[] {
  return loadRuns();
}

export function appendRunHistory(summary: RunSummary): void {
  const runs = loadRuns();
  runs.unshift(summary);
  saveRuns(runs);
}

function deathDescription(summary: RunSummary): string {
  if (summary.activeEventAtDeath === 'rug_pull') return 'The road disappeared. Classic.';
  if (summary.lastHazardHit === 'powell_speech') return 'Powell opened his mouth. Lemon down.';
  if (summary.activeEventAtDeath === 'knife') return 'A whale dumped directly on your citrus portfolio.';
  if (summary.lastHazardHit === 'monthly_inflation') return 'Inflation ate your tires.';
  if (summary.wasClosestToRewardZone) return 'So close. So sour.';
  return 'Another lemon sacrificed to the road.';
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function getHallOfShameCards(runs: RunSummary[] = getRunHistory()): HallOfShameCard[] {
  if (runs.length === 0) {
    return [
      {
        id: 'empty',
        title: 'No shame yet',
        description: 'Play a run. Fail spectacularly.',
        value: '—',
      },
    ];
  }

  const cards: HallOfShameCard[] = [];
  const todayRuns = runs.filter((r) => isToday(r.date));

  const rugRuns = todayRuns.filter((r) => r.activeEventAtDeath === 'rug_pull');
  if (rugRuns.length > 0) {
    const best = rugRuns.reduce((a, b) => (a.distance > b.distance ? a : b));
    cards.push({
      id: 'most_rugged',
      title: 'Most rugged today',
      description: deathDescription(best),
      value: `Rugged at ${Math.floor(best.distance)}m`,
    });
  }

  const whaleRuns = runs.filter((r) => r.activeEventAtDeath === 'knife');
  if (whaleRuns.length > 0) {
    const worst = whaleRuns.reduce((a, b) => (a.distance < b.distance ? a : b));
    cards.push({
      id: 'worst_whale',
      title: 'Worst whale dump',
      description: 'A whale used you as exit liquidity.',
      value: `${Math.floor(worst.distance)}m survival`,
    });
  }

  const fastest = runs.reduce((a, b) => (a.distance < b.distance ? a : b));
  cards.push({
    id: 'fastest_death',
    title: 'Fastest death',
    description: deathDescription(fastest),
    value: `${Math.floor(fastest.distance)}m`,
  });

  const closest = runs
    .filter((r) => r.wasClosestToRewardZone)
    .sort((a, b) => (a.rankDeltaPlaceholder ?? 999) - (b.rankDeltaPlaceholder ?? 999))[0];
  if (closest) {
    cards.push({
      id: 'closest_reward',
      title: 'Closest to reward zone',
      description: 'So close. So sour.',
      value: `Missed by ${closest.rankDeltaPlaceholder ?? '?'}m`,
    });
  }

  const longest = runs.reduce((a, b) => (a.distance > b.distance ? a : b));
  cards.push({
    id: 'longest',
    title: 'Longest survival',
    description: 'Peak citrus performance (still died).',
    value: `${Math.floor(longest.distance)}m`,
  });

  const powellDeaths = runs.filter((r) => r.lastHazardHit === 'powell_speech');
  if (powellDeaths.length > 0) {
    cards.push({
      id: 'powell_victims',
      title: 'Most Powell victims',
      description: 'Powell opened his mouth. Lemon down.',
      value: `${powellDeaths.length} today-ish`,
    });
  }

  const ridiculous = runs
    .filter((r) => r.distance < 100)
    .sort((a, b) => a.distance - b.distance)[0];
  if (ridiculous) {
    cards.push({
      id: 'ridiculous',
      title: 'Most ridiculous death',
      description: deathDescription(ridiculous),
      value: `${Math.floor(ridiculous.distance)}m`,
    });
  }

  return cards;
}
