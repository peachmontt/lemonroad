export const HOME_MEME_MESSAGES = [
  'TO THE MOON! 🌙',
  'WHEN LAMBO? 🏎️',
  'HODL 💎🙌',
  'MAKE A LEMON BECOME A MILLION 🍋',
  'ROAD TO 1 MILLION',
  'ONE MORE RUN',
  'BULLISH CITRUS',
  'NO UTILITY. ONLY ROAD.',
  'WEAK HANDS GET JUICED',
  'SQUEEZE THE MARKET',
  'LP ADDED',
  'JUST DRIVE 🍋',
  'CITRUS SEASON',
  'FREE RUNS. REAL JUICE.',
  'TOP OR BUST',
  'JUICE IT',
  'ROAD RICH',
  'STAY JUICY',
] as const;

export type StickerSide = 'left' | 'right';

export type StickerPosition = {
  side: StickerSide;
  top: string;
};

/** Safe gutters on wide layouts — clear of centered ~720px content column. */
export const DESKTOP_STICKER_POSITIONS: StickerPosition[] = [
  { side: 'left', top: '22%' },
  { side: 'left', top: '48%' },
  { side: 'left', top: '70%' },
  { side: 'right', top: '26%' },
  { side: 'right', top: '52%' },
  { side: 'right', top: '68%' },
];

/** Edge zones only — avoids crowding narrow center column, footer, and FAB. */
export const MOBILE_STICKER_POSITIONS: StickerPosition[] = [
  { side: 'left', top: '20%' },
  { side: 'left', top: '44%' },
  { side: 'right', top: '36%' },
  { side: 'right', top: '58%' },
];

export const MOBILE_BREAKPOINT_PX = 768;
