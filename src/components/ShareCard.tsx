import { forwardRef } from 'react';
import { getDisplayUrl } from '../utils/share';
import type { GameSnapshot } from '../game/types';

interface ShareCardProps {
  snapshot: GameSnapshot;
  juiceTitle: string;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ snapshot, juiceTitle }, ref) {
    const meters = Math.floor(snapshot.distance);
    const displayUrl = getDisplayUrl();

    return (
      <div ref={ref} className="share-card">
        <div className="share-card-top-bar" />

        <p className="share-card-brand">LEMON ROAD</p>

        <p className="share-card-hook">
          I GOT JUICED AT <strong>{meters}M</strong>
        </p>

        <p className="share-card-rank">Rank: {juiceTitle}</p>

        <p className="share-card-tagline-main">No utility. No brakes. Only road.</p>

        <p className="share-card-cta-text">Can you out-squeeze me?</p>

        <div className="share-card-play-btn">PLAY NOW — FREE</div>

        <p className="share-card-url-small">{displayUrl}</p>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';
