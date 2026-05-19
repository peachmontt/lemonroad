import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import type { GameSnapshot } from '../game/types';
import { buildShareCaption } from '../utils/share';
import { ShareCard } from './ShareCard';
import { ShareMenu } from './ShareMenu';

interface DeathOverlayProps {
  snapshot: GameSnapshot;
  onRetry: () => void;
}

function computeRank(distance: number): number {
  return Math.max(1000, Math.floor(50000 - distance * 42 + Math.random() * 500));
}

export function DeathOverlay({ snapshot, onRetry }: DeathOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rank] = useState(() => computeRank(snapshot.distance));
  const [sharing, setSharing] = useState(false);
  const [shareReady, setShareReady] = useState<{
    dataUrl: string;
    file: File;
    caption: string;
  } | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);

  const isDead = snapshot.phase === 'dead';

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 1200,
        height: 630,
        pixelRatio: 2,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'lemon-fail.png', { type: 'image/png' });
      const caption = buildShareCaption(snapshot, rank);
      setShareReady({ dataUrl, file, caption });
    } catch {
      /* capture failed */
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={`overlay death-overlay ${isDead ? 'visible' : 'juicing'}`}>
      <h1 className="juiced-title">YOU GOT JUICED</h1>

      {isDead && (
        <>
          <div className="death-panel">
            <div className="death-stats">
              <p>distance: {Math.floor(snapshot.distance)}m</p>
              <p>juice level: {snapshot.juiceLevel}</p>
              <p>citric velocity: {snapshot.citricVelocity.toFixed(2)}</p>
            </div>

            {!errorDismissed && (
              <div className="fake-error" role="alert">
                <div className="fake-error-titlebar">
                  <span className="fake-error-icon">!</span>
                  <span>citric.dll — Application Error</span>
                </div>
                <div className="fake-error-body">
                  <p className="fake-error-msg">
                    The instruction at 0x00C171C referenced memory at 0x00000000.
                    The memory could not be &quot;read&quot;.
                  </p>
                  <p className="fake-error-detail">citric.dll has stopped working</p>
                  <button
                    type="button"
                    className="fake-error-ok"
                    onClick={() => setErrorDismissed(true)}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="share-preview-label">this is what your friends will see:</p>
          <div className="share-preview-scaler" aria-hidden="true">
            <ShareCard snapshot={snapshot} rank={rank} />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? 'SQUEEZING PNG...' : 'SHARE YOUR FAILURE'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            TRY AGAIN
          </button>
        </>
      )}

      {shareReady && (
        <ShareMenu
          dataUrl={shareReady.dataUrl}
          file={shareReady.file}
          caption={shareReady.caption}
          onClose={() => setShareReady(null)}
        />
      )}

      <div className="share-card-hidden">
        <ShareCard ref={cardRef} snapshot={snapshot} rank={rank} />
      </div>
    </div>
  );
}
