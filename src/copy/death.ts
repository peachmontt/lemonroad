export function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const JUICE_TITLES = [
  { min: 0, max: 100, title: 'Kitchen Accident' },
  { min: 100, max: 300, title: 'Baby Squeezer' },
  { min: 300, max: 600, title: 'Citrus Intern' },
  { min: 600, max: 900, title: 'Lemon Hands' },
  { min: 900, max: 1200, title: 'Road Goblin' },
  { min: 1200, max: 2000, title: 'Squeeze Prophet' },
  { min: 2000, max: Infinity, title: 'The Final Lemon' },
] as const;

export function getJuiceTitle(distance: number): string {
  const d = Math.max(0, distance);
  for (const tier of JUICE_TITLES) {
    if (d < tier.max) return tier.title;
  }
  return 'The Final Lemon';
}

const DEATH_ROASTS_DISTANCE = [
  (m: number) => `${m}m? Bro, the lemon barely left the kitchen.`,
  (m: number) => `You survived ${m}m. A real lemon would be ashamed.`,
  (m: number) => `${m}m on Lemon Road. That's not a run, that's a warmup.`,
  (m: number) => `${m}m? The road didn't even notice you.`,
  (m: number) => `Only ${m}m? My grandma squeezes harder.`,
  (m: number) => `${m}m — the lemon is still in the parking lot.`,
  (m: number) => `You made it ${m}m. The SEC made it to your wallet faster.`,
];

const DEATH_ROASTS_STATIC = [
  'Your lemon hands are weak.',
  'You got squeezed before the chart loaded.',
  'The road called. It wants its dignity back.',
  'Juiced before the tutorial ended.',
  'That wasn\'t a run. That was a sneeze.',
  'Bro really thought he was built different.',
  'Lemon Road rejected your application.',
  'You left more juice on the road than distance.',
  'The pothole had better timing than you.',
  'Certified kitchen-tier performance.',
  'Even the rug pull felt bad for you.',
  'Speedrun any% — straight to the juice.',
];

const DEATH_QUOTES = [
  'You got squeezed before the first candle.',
  'No utility. No brakes. Only shame.',
  'The lemon saw you coming and yawned.',
  'CT is gonna love this one.',
  'Rug pull? Nah. Self pull.',
  'Chart never loaded. Respect.',
  'Weak hands, weaker citrus.',
  'This run belongs in a museum. The bad one.',
];

const CAUSES_OF_JUICE = [
  'SEC caught me',
  'rug pull pothole',
  'emotional damage',
  'low liquidity',
  'paper hands',
  'weak lemon hands',
  'overleveraged tilt',
  'chart went vertical (off the road)',
  'forgot to DYOR the yellow line',
];

const SHARE_BUTTON_LABELS = [
  'POST YOUR SHAME',
  'SHARE THE JUICE',
  'TWEET MY FAILURE',
  'LET CT LAUGH',
  'SHOW MY WEAK HANDS',
] as const;

const RETRY_BUTTON_LABELS = [
  'SQUEEZE AGAIN',
  'REDEEM YOUR LEMON',
  'RUN IT BACK',
  'I CAN DO BETTER',
] as const;

export function pickDeathRoast(distance: number): string {
  const m = Math.floor(distance);
  const useDistance = m < 300 || Math.random() < 0.55;
  if (useDistance) {
    return pickOne(DEATH_ROASTS_DISTANCE)(m);
  }
  return pickOne(DEATH_ROASTS_STATIC);
}

export function pickDeathQuote(): string {
  return pickOne(DEATH_QUOTES);
}

export function pickCauseOfJuice(): string {
  return pickOne(CAUSES_OF_JUICE);
}

export function pickShareButtonLabel(): (typeof SHARE_BUTTON_LABELS)[number] {
  return pickOne(SHARE_BUTTON_LABELS);
}

export function pickRetryButtonLabel(): (typeof RETRY_BUTTON_LABELS)[number] {
  return pickOne(RETRY_BUTTON_LABELS);
}

export function pickRewardRetryLabel(gapFromTop10: number | null): string {
  if (gapFromTop10 != null && gapFromTop10 > 0 && gapFromTop10 <= 200) {
    return `TRY AGAIN — ${gapFromTop10}m FROM TOP 10`;
  }
  if (gapFromTop10 != null && gapFromTop10 > 0) {
    return `TRY AGAIN — NEED TOP 10`;
  }
  return pickRetryButtonLabel();
}
