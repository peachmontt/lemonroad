import { forwardRef } from 'react';
import { getDisplayUrl } from '../utils/share';
import type { GameSnapshot } from '../game/types';

interface ShareCardProps {
  snapshot: GameSnapshot;
  rank: number;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ snapshot, rank }, ref) {
    const meters = Math.floor(snapshot.distance);
    const displayUrl = getDisplayUrl();

    return (
      <div ref={ref} className="share-card">
        <div className="share-card-top-bar" />

        <p className="share-card-brand">LEMON ROAD</p>
        <p className="share-card-sub">the future of citrus transportation</p>

        <p className="share-card-hook">YOU GOT JUICED</p>
        <p className="share-card-challenge">
          I only survived <strong>{meters}m</strong> before the SEC caught me.
        </p>
        <p className="share-card-cta-text">CAN YOU STAY ON THE ROAD LONGER?</p>

        <div className="share-card-play-btn">▶ PLAY NOW — FREE</div>

        <div className="share-card-link-box">
          <span className="share-card-link-arrow">→</span>
          <span className="share-card-url">{displayUrl}</span>
        </div>

        <p className="share-card-tagline">No utility. Only road. · $LEMON</p>

        <p className="share-card-stats-mini">
          juice: {snapshot.juiceLevel} · #{rank.toLocaleString()} juiced globally
        </p>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';
