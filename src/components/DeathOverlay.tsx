import { toPng } from 'html-to-image';
import { useEffect, useRef, useState } from 'react';
import type { GameSnapshot } from '../game/types';
import { submitRun } from '../lib/api';
import type { GameMode } from '../types/game';
import { computeRank } from '../utils/rank';
import { buildShareCaption } from '../utils/share';
import { ShareCard } from './ShareCard';
import { ShareMenu } from './ShareMenu';

interface DeathOverlayProps {
  snapshot: GameSnapshot;
  gameMode: GameMode;
  playDurationMs: number;
  depositTx: string | null;
  walletPubkey: string | null;
  onRetry: () => void;
  onRunSaved?: () => void;
}

export function DeathOverlay({
  snapshot,
  gameMode,
  playDurationMs,
  depositTx,
  walletPubkey,
  onRetry,
  onRunSaved,
}: DeathOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rank] = useState(() => computeRank(snapshot.distance));
  const [sharing, setSharing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef(false);
  const [shareReady, setShareReady] = useState<{
    dataUrl: string;
    file: File;
    caption: string;
  } | null>(null);
  const isDead = snapshot.phase === 'dead';

  useEffect(() => {
    if (!isDead || savedRef.current) return;
    savedRef.current = true;

    void submitRun({
      mode: gameMode,
      distance: snapshot.distance,
      juiceLevel: snapshot.juiceLevel,
      citricVelocity: snapshot.citricVelocity,
      durationMs: playDurationMs,
      ...(gameMode === 'paid' && depositTx && walletPubkey
        ? { depositTx, walletPubkey }
        : {}),
    })
      .then(() => onRunSaved?.())
      .catch((e) => {
        setSaveError(e instanceof Error ? e.message : 'Failed to save run');
        savedRef.current = false;
      });
  }, [
    isDead,
    gameMode,
    snapshot.distance,
    snapshot.juiceLevel,
    snapshot.citricVelocity,
    playDurationMs,
    depositTx,
    walletPubkey,
    onRunSaved,
  ]);

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
              <p className="run-mode-tag">mode: {gameMode}</p>
            </div>
          </div>
          {saveError && <p className="tilt-msg">{saveError}</p>}

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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRetry}
          >
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
