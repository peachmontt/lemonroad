import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  DESKTOP_MIN_WIDTH_PX,
  DESKTOP_STICKER_POSITIONS,
  HOME_MEME_MESSAGES,
  type StickerPosition,
} from './homeMemeStickersData';

type HomeMemeSticker = {
  id: string;
  text: string;
  position: StickerPosition;
  rotationDeg: number;
  floatDelayS: number;
};

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function buildStickers(): HomeMemeSticker[] {
  const count = randomInt(1, 3);
  const messages = shuffle(HOME_MEME_MESSAGES).slice(0, count);
  const slots = shuffle(DESKTOP_STICKER_POSITIONS).slice(0, count);

  return messages.map((text, index) => ({
    id: `${text}-${index}`,
    text,
    position: slots[index],
    rotationDeg: randomInt(-7, 7),
    floatDelayS: index * 0.35,
  }));
}

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`).matches;
}

export function HomeMemeStickers() {
  const stickers = useMemo(() => (isDesktopViewport() ? buildStickers() : []), []);

  if (stickers.length === 0) return null;

  return createPortal(
    <div className="home-meme-stickers" aria-hidden="true">
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          className={`home-meme-sticker home-meme-sticker--${sticker.position.side}`}
          style={{
            top: sticker.position.top,
            ['--sticker-rotate' as string]: `${sticker.rotationDeg}deg`,
            animationDelay: `${sticker.floatDelayS}s, ${sticker.floatDelayS * 0.5}s`,
          }}
        >
          {sticker.text}
        </div>
      ))}
    </div>,
    document.body,
  );
}
