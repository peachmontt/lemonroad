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

export const DESKTOP_MIN_WIDTH_PX = 768;

/** Safe gutters on wide layouts — clear of centered ~720px content column. */
export const DESKTOP_STICKER_POSITIONS: StickerPosition[] = [
  { side: 'left', top: '22%' },
  { side: 'left', top: '48%' },
  { side: 'left', top: '70%' },
  { side: 'right', top: '26%' },
  { side: 'right', top: '52%' },
  { side: 'right', top: '68%' },
];
