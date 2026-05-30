export interface LemonLevelDefinition {
  level: number;
  title: string;
  xpRequired: number;
}

export const LEMON_LEVELS: readonly LemonLevelDefinition[] = [
  { level: 1, title: 'Lemon Newbie', xpRequired: 0 },
  { level: 2, title: 'Sour Starter', xpRequired: 100 },
  { level: 3, title: 'Road Squeezer', xpRequired: 250 },
  { level: 4, title: 'Lemon Hustler', xpRequired: 500 },
  { level: 5, title: 'Citrus Grinder', xpRequired: 900 },
  { level: 6, title: 'Rug Survivor', xpRequired: 1400 },
  { level: 7, title: 'Yellow Menace', xpRequired: 2000 },
  { level: 8, title: 'Lemon Lord', xpRequired: 3000 },
  { level: 9, title: 'Golden Squeezer', xpRequired: 4500 },
  { level: 10, title: 'Lemon Millionaire', xpRequired: 6500 },
] as const;

export interface LemonLevelInfo extends LemonLevelDefinition {
  label: string;
}

/** Resolve level from lifetime (total) Lemon XP. */
export function getLemonLevel(totalLemonXp: number): LemonLevelInfo {
  const xp = Math.max(0, Math.floor(totalLemonXp));
  let current = LEMON_LEVELS[0]!;

  for (const def of LEMON_LEVELS) {
    if (xp >= def.xpRequired) {
      current = def;
    } else {
      break;
    }
  }

  return {
    ...current,
    label: formatLemonLevelLabel(current.level, current.title),
  };
}

export function formatLemonLevelLabel(level: number, title: string): string {
  return `Level ${level} — ${title}`;
}

export function formatLemonLevelShort(level: number): string {
  return `Lv. ${level}`;
}

export function formatXpGained(amount: number): string {
  const n = Math.round(amount);
  const prefix = n >= 0 ? '+' : '';
  return `${prefix}${n.toLocaleString()} XP`;
}
