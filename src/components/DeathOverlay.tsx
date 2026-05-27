import { toPng } from 'html-to-image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  getJuiceTitle,
  pickCauseOfJuice,
  pickDeathQuote,
  pickDeathRoast,
  pickRetryButtonLabel,
  pickShareButtonLabel,
} from '../copy/death';
import type { GameSnapshot } from '../game/types';
import type { DailyRankContext } from '../hooks/useDailyRank';
import {
  classifyFreeRunResult,
  getEstimatedReward,
  getResultRetryLabel,
} from '../lib/dailyRankLogic';
import { submitRun } from '../lib/api';
import { trackRunEnd } from '../lib/analytics';
import { PAYMENT_SAVE_ERROR_MESSAGE } from '../config/payment';
import type { GameMode } from '../types/game';
import type { PlayerResponse } from '../lib/api';
import { computeRank } from '../utils/rank';
import { buildShareCaption } from '../utils/share';
import { ShareCard } from './ShareCard';
import { ShareMenu } from './ShareMenu';
import { WalletLinkPrompt } from './WalletLinkPrompt';
import { WalletConfirmedCard } from './WalletConfirmedCard';
import { PostDeathUnlocks } from './PostDeathCard';
import { DailyResetCountdown } from './DailyResetCountdown';
import { FreeRewardTrustCopy } from './FreeRewardTrustCopy';
import type { PlayerProgress, UnlockNotification } from '../game/progression';

interface DeathOverlayProps {
  snapshot: GameSnapshot;
  gameMode: GameMode;
  playDurationMs: number;
  depositTx: string | null;
  walletPubkey: string | null;
  paymentChain?: 'solana' | 'evm';
  player?: PlayerResponse | null;
  dailyRank?: DailyRankContext | null;
  onRetry: () => void;
  onRunSaved?: () => void;
  onWalletLinked?: (walletPubkey: string) => Promise<void>;
  recentUnlocks?: UnlockNotification[];
  progress?: PlayerProgress | null;
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
  player,
  dailyRank,
  onRetry,
  onRunSaved,
  onWalletLinked,
  recentUnlocks = [],
  progress = null,
}: DeathOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const meters = Math.floor(snapshot.distance);

  // Capture unstable props in refs so the save effect doesn't re-fire on every emitSnapshot tick
  const playDurationMsRef = useRef(playDurationMs);
  const onRunSavedRef = useRef(onRunSaved);
  useEffect(() => { playDurationMsRef.current = playDurationMs; });
  useEffect(() => { onRunSavedRef.current = onRunSaved; });

  const [juiceTitle] = useState(() => getJuiceTitle(snapshot.distance));
  const [globalRank] = useState(() => computeRank(snapshot.distance));
  const [roast] = useState(() => pickDeathRoast(snapshot.distance));
  const [quote] = useState(() => pickDeathQuote());
  const [cause] = useState(() => pickCauseOfJuice());
  const [shareLabel] = useState(() => pickShareButtonLabel());
  const [retryLabel] = useState(() => pickRetryButtonLabel());
  const deathRank =
    gameMode === 'free' && dailyRank
      ? dailyRank.computeDeathRank(meters)
      : null;
  const resultState = deathRank ? classifyFreeRunResult(deathRank) : null;
  const displayRetryLabel =
    gameMode === 'free' && resultState && resultState !== 'unranked'
      ? getResultRetryLabel(resultState)
      : retryLabel;
  const isDead = snapshot.phase === 'dead';
  const [sharing, setSharing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [walletPromptDismissed, setWalletPromptDismissed] = useState(false);
  const [changingWallet, setChangingWallet] = useState(false);
  const [runSaved, setRunSaved] = useState(false);
  const savedRef = useRef(false);

  const linkedWallet = player?.walletPubkey ?? null;

  const showWalletInput =
    isDead &&
    runSaved &&
    gameMode === 'free' &&
    !walletPromptDismissed &&
    !!player &&
    !!onWalletLinked &&
    (!linkedWallet || changingWallet);

  const showWalletConfirmation =
    isDead &&
    runSaved &&
    gameMode === 'free' &&
    !!linkedWallet &&
    !changingWallet;
  const [shareReady, setShareReady] = useState<{
    dataUrl: string;
    file: File;
    caption: string;
  } | null>(null);

  useEffect(() => {
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
        setRunSaved(true);
        onRunSavedRef.current?.();
      })
      .catch((e) => {
        const raw = e instanceof Error ? e.message : 'Failed to save run';
        const message =
          gameMode === 'paid' &&
          (raw.includes('Payment could not be saved') ||
            raw.includes('Could not save run'))
            ? PAYMENT_SAVE_ERROR_MESSAGE
            : raw;
        setSaveError(message);
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
      <div className="death-overlay-backdrop" aria-hidden="true" />

      <div className="death-overlay-inner">
        {isDead && <DeathScene />}
        <div className="death-content">
        <h1 className="juiced-title">YOU GOT JUICED</h1>

        {isDead && (
          <>
            <p className="death-roast">{roast}</p>
            <p className="death-quote">&ldquo;{quote}&rdquo;</p>
            <PostDeathUnlocks unlocks={recentUnlocks} progress={progress} />

            <div className="death-panel">
              <div className="death-stats">
                <p>distance: {meters}m</p>
                <p>rank: {juiceTitle}</p>
                {gameMode === 'free' && deathRank && (
                  <div className="death-reward-panel">
                    {resultState === 'in_top_3' && deathRank.rank != null ? (
                      <>
                        <p>You&apos;re currently #{deathRank.rank}</p>
                        {getEstimatedReward(deathRank.rank) && (
                          <p className="death-reward-estimate">
                            Estimated reward: {getEstimatedReward(deathRank.rank)}
                          </p>
                        )}
                        <p>Stay in Top 3 until daily reset to win</p>
                      </>
                    ) : resultState === 'close_to_prize' &&
                      deathRank.gapFromPrizeZone != null ? (
                      <>
                        <p>Almost juicy enough</p>
                        <p>
                          Only {deathRank.gapFromPrizeZone}m away from today&apos;s $4 spot
                        </p>
                      </>
                    ) : resultState === 'far_from_prize' &&
                      deathRank.gapFromPrizeZone != null ? (
                      <p>Beat {deathRank.gapFromPrizeZone}m to enter today&apos;s rewards</p>
                    ) : deathRank.rank != null ? (
                      <p>You&apos;re currently #{deathRank.rank}</p>
                    ) : (
                      <p>Play a run to enter today&apos;s board</p>
                    )}
                    <DailyResetCountdown nextResetAt={dailyRank?.nextResetAt ?? null} />
                    <FreeRewardTrustCopy className="free-reward-trust free-reward-trust-panel" />
                  </div>
                )}
                <p>cause of juice: {cause}</p>
                <p className="run-mode-tag">wallet damage: {gameMode === 'free' ? '$0' : '💸'}</p>
              </div>
            </div>
            {saveError && <p className="tilt-msg">{saveError}</p>}

            {showWalletInput && onWalletLinked && (
              <WalletLinkPrompt
                variant={linkedWallet ? 'change' : 'initial'}
                onSave={async (addr) => {
                  await onWalletLinked(addr);
                  setChangingWallet(false);
                }}
                onDismiss={() => setWalletPromptDismissed(true)}
                onCancel={linkedWallet ? () => setChangingWallet(false) : undefined}
              />
            )}

            {showWalletConfirmation && linkedWallet && (
              <WalletConfirmedCard
                walletPubkey={linkedWallet}
                onChangeWallet={() => setChangingWallet(true)}
              />
            )}

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
                {displayRetryLabel}
              </button>
            </div>

            <p className="share-preview-label">this is what your friends will see:</p>
            <div className="share-preview-scaler" aria-hidden="true">
              <ShareCard snapshot={snapshot} juiceTitle={juiceTitle} preview />
            </div>
          </>
        )}
        </div>
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
