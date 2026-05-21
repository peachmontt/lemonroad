import { toPng } from 'html-to-image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
// #region agent log
const _dbgEffectCount = { n: 0 };
// #endregion
import {
  getJuiceTitle,
  pickCauseOfJuice,
  pickDeathQuote,
  pickDeathRoast,
  pickRetryButtonLabel,
  pickShareButtonLabel,
} from '../copy/death';
import type { GameSnapshot } from '../game/types';
import { submitRun } from '../lib/api';
import { trackRunEnd } from '../lib/analytics';
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
  paymentChain?: 'solana' | 'evm';
  onRetry: () => void;
  onRunSaved?: () => void;
}

function DeathScene() {
  return (
    <div className="death-scene" aria-hidden="true">
      <div className="death-juice-stain" />
      <div className="death-flash death-flash-left" />
      <div className="death-flash death-flash-right" />
      <div className="death-tape">
        <span>JUICE SCENE DO NOT CROSS</span>
        <span>JUICE SCENE DO NOT CROSS</span>
        <span>JUICE SCENE DO NOT CROSS</span>
      </div>
      <div className="death-drops">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="death-drop" style={{ '--i': i } as CSSProperties} />
        ))}
      </div>
      <div className="death-broken-lemon">
        <span className="death-lemon-half death-lemon-left" />
        <span className="death-lemon-pit" />
        <span className="death-lemon-half death-lemon-right" />
      </div>
    </div>
  );
}

export function DeathOverlay({
  snapshot,
  gameMode,
  playDurationMs,
  depositTx,
  walletPubkey,
  paymentChain = 'solana',
  onRetry,
  onRunSaved,
}: DeathOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const meters = Math.floor(snapshot.distance);

  // Capture unstable props in refs so the save effect doesn't re-fire on every emitSnapshot tick
  const playDurationMsRef = useRef(playDurationMs);
  const onRunSavedRef = useRef(onRunSaved);
  useEffect(() => { playDurationMsRef.current = playDurationMs; });
  useEffect(() => { onRunSavedRef.current = onRunSaved; });

  // #region agent log
  const [juiceTitle] = useState(() => {
    try { return getJuiceTitle(snapshot.distance); }
    catch(e) { fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'61b939'},body:JSON.stringify({sessionId:'61b939',location:'DeathOverlay.tsx:init',message:'getJuiceTitle crash',data:{err:String(e),dist:snapshot.distance},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{}); return 'Error'; }
  });
  const [globalRank] = useState(() => computeRank(snapshot.distance));
  const [roast] = useState(() => {
    try { return pickDeathRoast(snapshot.distance); }
    catch(e) { fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'61b939'},body:JSON.stringify({sessionId:'61b939',location:'DeathOverlay.tsx:init',message:'pickDeathRoast crash',data:{err:String(e),dist:snapshot.distance},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{}); return 'Error'; }
  });
  // #endregion
  const [quote] = useState(() => pickDeathQuote());
  const [cause] = useState(() => pickCauseOfJuice());
  const [shareLabel] = useState(() => pickShareButtonLabel());
  const [retryLabel] = useState(() => pickRetryButtonLabel());
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
    // #region agent log
    _dbgEffectCount.n += 1;
    const callN = _dbgEffectCount.n;
    fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'61b939'},body:JSON.stringify({sessionId:'61b939',location:'DeathOverlay.tsx:effect',message:'effect fired (post-fix)',data:{callN,isDead,savedRef:savedRef.current},timestamp:Date.now(),hypothesisId:'H-A',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    if (!isDead || savedRef.current) return;
    savedRef.current = true;

    const durationMs = playDurationMsRef.current;

    trackRunEnd({
      mode: gameMode,
      distance: snapshot.distance,
      durationMs,
      juiceLevel: snapshot.juiceLevel,
    });

    void submitRun({
      mode: gameMode,
      distance: snapshot.distance,
      juiceLevel: snapshot.juiceLevel,
      citricVelocity: snapshot.citricVelocity,
      durationMs,
      ...(gameMode === 'paid' && depositTx && walletPubkey
        ? { depositTx, walletPubkey, paymentChain }
        : {}),
    })
      .then(() => {
        // #region agent log
        fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'61b939'},body:JSON.stringify({sessionId:'61b939',location:'DeathOverlay.tsx:submitRun',message:'submitRun SUCCESS (post-fix)',data:{durationMs},timestamp:Date.now(),hypothesisId:'H-C',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        onRunSavedRef.current?.();
      })
      .catch((e) => {
        // #region agent log
        fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'61b939'},body:JSON.stringify({sessionId:'61b939',location:'DeathOverlay.tsx:submitRun',message:'submitRun FAILED — savedRef NOT reset (post-fix)',data:{err:String(e),callN},timestamp:Date.now(),hypothesisId:'H-A H-C',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        setSaveError(e instanceof Error ? e.message : 'Failed to save run');
        // savedRef.current stays true — prevents infinite retry loop on API failure
      });
  }, [
    isDead,
    gameMode,
    snapshot.distance,
    snapshot.juiceLevel,
    snapshot.citricVelocity,
    depositTx,
    walletPubkey,
    paymentChain,
    // playDurationMs and onRunSaved intentionally excluded — captured via refs above
    // to prevent re-firing on every emitSnapshot tick (every 100ms in dead phase)
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
      const caption = buildShareCaption(snapshot, juiceTitle, globalRank);
      setShareReady({ dataUrl, file, caption });
    } catch {
      /* capture failed */
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={`overlay death-overlay ${isDead ? 'visible' : 'juicing'}`}>
      {isDead && <DeathScene />}

      <div className="death-content">
        <h1 className="juiced-title">YOU GOT JUICED</h1>

        {isDead && (
          <>
            <p className="death-roast">{roast}</p>
            <p className="death-quote">&ldquo;{quote}&rdquo;</p>

            <div className="death-panel">
              <div className="death-stats">
                <p>distance: {meters}m</p>
                <p>rank: {juiceTitle}</p>
                <p>cause of juice: {cause}</p>
                <p className="run-mode-tag">mode: {gameMode}</p>
              </div>
            </div>
            {saveError && <p className="tilt-msg">{saveError}</p>}

            <p className="share-preview-label">this is what your friends will see:</p>
            <div className="share-preview-scaler" aria-hidden="true">
              <ShareCard snapshot={snapshot} juiceTitle={juiceTitle} />
            </div>

            <div className="death-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? 'SQUEEZING PNG...' : shareLabel}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-retry"
                onClick={onRetry}
              >
                {retryLabel}
              </button>
            </div>
          </>
        )}
      </div>

      {shareReady && (
        <ShareMenu
          dataUrl={shareReady.dataUrl}
          file={shareReady.file}
          caption={shareReady.caption}
          onClose={() => setShareReady(null)}
        />
      )}

      <div className="share-card-hidden">
        <ShareCard ref={cardRef} snapshot={snapshot} juiceTitle={juiceTitle} />
      </div>
    </div>
  );
}
