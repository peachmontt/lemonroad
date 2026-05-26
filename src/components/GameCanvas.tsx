import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount } from 'wagmi';
import { useGameEngine } from '../hooks/useGameEngine';
import { usePaidAttempt } from '../hooks/usePaidAttempt';
import { useEvmPaidAttempt } from '../hooks/useEvmPaidAttempt';
import { usePlayer } from '../hooks/usePlayer';
import { usePwaOnboarding } from '../hooks/usePwaOnboarding';
import type { GameMode } from '../types/game';
import { useDailyRank } from '../hooks/useDailyRank';
import { trackGameStart, trackWalletConnect, trackPaidDeposit, trackPaymentError } from '../lib/analytics';
import { DeathOverlay } from './DeathOverlay';
import { FakeModal, type ModalTab } from './FakeModal';
import { HudOverlay } from './HudOverlay';
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  OnboardingOverlay,
} from './OnboardingOverlay';
import { StartOverlay } from './StartOverlay';
import type { WalletChannel } from './WalletConnectButton';
import { useDeviceTilt } from '../hooks/useDeviceTilt';
import { InstallNudgeCard } from './pwa/InstallNudgeCard';
import { NotificationNudgeCard } from './pwa/NotificationNudgeCard';

interface GameCanvasProps {
  modalTab: ModalTab | null;
  onOpenModal: (tab: ModalTab) => void;
  onCloseModal: () => void;
}

export function GameCanvas({ modalTab, onOpenModal, onCloseModal }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { snapshot, start, reset, setTilt, toggleMute, playDurationMs } =
    useGameEngine(canvasRef);
  const [tiltMsg, setTiltMsg] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('free');
  const [walletChannel, setWalletChannel] = useState<WalletChannel>('solana');
  const [activeMode, setActiveMode] = useState<GameMode>('free');
  const [activeDepositTx, setActiveDepositTx] = useState<string | null>(null);
  const [activeWalletKey, setActiveWalletKey] = useState<string | null>(null);
  const [activePaymentChain, setActivePaymentChain] = useState<'solana' | 'evm'>('solana');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pendingStartRef = useRef<(() => void) | null>(null);

  const { publicKey } = useWallet();
  const { address: evmAddress } = useAccount();

  useEffect(() => {
    if (publicKey) trackWalletConnect(publicKey.toBase58());
  }, [publicKey]);
  useEffect(() => {
    if (evmAddress) trackWalletConnect(evmAddress);
  }, [evmAddress]);

  const { player, runs, loading: runsLoading, setDisplayName, linkWallet, reloadRuns } = usePlayer();
  const dailyRank = useDailyRank(player?.playerId);
  const {
    showInstallNudge,
    showNotificationNudge,
    onEngagement,
    dismissInstall,
    dismissNotification,
  } = usePwaOnboarding();
  const {
    pending: paidPending,
    depositTx,
    error: paidError,
    payForAttempt,
    reset: resetPaid,
  } = usePaidAttempt();
  const {
    pending: evmPending,
    depositTx: evmDepositTx,
    error: evmError,
    payForAttempt: evmPayForAttempt,
    reset: evmResetPaid,
  } = useEvmPaidAttempt();

  const onTilt = useCallback(
    (x: number) => setTilt(x, true),
    [setTilt],
  );

  const { status, needsPermission, requestTilt } = useDeviceTilt(onTilt);

  const beginRun = async () => {
    if (needsPermission && status !== 'granted') {
      const ok = await requestTilt();
      if (!ok) {
        setTiltMsg('tilt denied. use finger like a peasant.');
      } else {
        setTilt(0, true);
      }
    }
    setActiveMode(gameMode);
    trackGameStart(gameMode);
    start();
  };

  const dismissOnboarding = () => {
    markOnboardingSeen();
    setShowOnboarding(false);
    const pending = pendingStartRef.current;
    pendingStartRef.current = null;
    pending?.();
  };

  const queueStart = (fn: () => void | Promise<void>) => {
    if (!hasSeenOnboarding()) {
      pendingStartRef.current = () => {
        void fn();
      };
      setShowOnboarding(true);
      return;
    }
    void fn();
  };

  const handleStart = () => {
    queueStart(beginRun);
  };

  const handleStartPaid = () => {
    const runPaid = async () => {
      if (walletChannel === 'evm') {
        if (!evmAddress) return;

        let tx = evmDepositTx;
        if (!tx) {
          tx = await evmPayForAttempt();
          if (!tx) {
            if (evmError) trackPaymentError(evmError);
            return;
          }
          trackPaidDeposit({ hourBucket: String(Math.floor(Date.now() / 3_600_000)), walletPrefix: evmAddress });
        }

        setActiveDepositTx(tx);
        setActiveWalletKey(evmAddress);
        setActivePaymentChain('evm');
        await beginRun();
      } else {
        if (!publicKey) return;

        let tx = depositTx;
        if (!tx) {
          tx = await payForAttempt();
          if (!tx) {
            if (paidError) trackPaymentError(paidError);
            return;
          }
          trackPaidDeposit({ hourBucket: String(Math.floor(Date.now() / 3_600_000)), walletPrefix: publicKey.toBase58() });
        }

        setActiveDepositTx(tx);
        setActiveWalletKey(publicKey.toBase58());
        setActivePaymentChain('solana');
        await beginRun();
      }
    };

    queueStart(runPaid);
  };

  const handleRetry = () => {
    reset();
    resetPaid();
    evmResetPaid();
    setActiveDepositTx(null);
    setActiveWalletKey(null);
    setTiltMsg(null);
  };

  const isGameplay = snapshot.phase !== 'idle';

  useEffect(() => {
    document.body.classList.toggle('gameplay-active', isGameplay);
    document.documentElement.classList.toggle('gameplay-active', isGameplay);
    window.dispatchEvent(new Event('resize'));
    return () => {
      document.body.classList.remove('gameplay-active');
      document.documentElement.classList.remove('gameplay-active');
    };
  }, [isGameplay]);

  const gameRootClass = useMemo(
    () => (isGameplay ? 'game-root gameplay-screen' : 'game-root'),
    [isGameplay],
  );

  return (
    <div className={gameRootClass}>
      <canvas ref={canvasRef} className="game-canvas" />

      {snapshot.phase === 'playing' && (
        <HudOverlay
          snapshot={snapshot}
          gameMode={activeMode}
          dailyRank={dailyRank}
          onToggleMute={toggleMute}
        />
      )}

      {showOnboarding && <OnboardingOverlay onDismiss={dismissOnboarding} />}

      {snapshot.phase === 'idle' && (
        <StartOverlay
          gameMode={gameMode}
          onGameModeChange={setGameMode}
          walletChannel={walletChannel}
          onWalletChannelChange={setWalletChannel}
          onStart={handleStart}
          onStartPaid={() => void handleStartPaid()}
          onOpenModal={onOpenModal}
          tiltMsg={tiltMsg}
          needsTilt={needsPermission && status !== 'granted'}
          player={player}
          runs={runs}
          runsLoading={runsLoading}
          onSaveName={setDisplayName}
          paidPending={paidPending || evmPending}
          paidError={paidError ?? evmError}
          hasPaidDeposit={walletChannel === 'evm' ? !!evmDepositTx : !!depositTx}
        />
      )}

      {(snapshot.phase === 'dying' || snapshot.phase === 'dead') && (
        <DeathOverlay
          snapshot={snapshot}
          gameMode={activeMode}
          playDurationMs={playDurationMs()}
          depositTx={activeDepositTx}
          walletPubkey={activeWalletKey}
          paymentChain={activePaymentChain}
          player={player}
          dailyRank={activeMode === 'free' ? dailyRank : null}
          onRetry={handleRetry}
          onRunSaved={() => {
            void reloadRuns();
            dailyRank.refresh();
            resetPaid();
            evmResetPaid();
            setActiveDepositTx(null);
            setActiveWalletKey(null);
            onEngagement('gameOver');
          }}
          onWalletLinked={async (addr) => {
            await linkWallet(addr);
            onEngagement('walletSaved');
          }}
        />
      )}

      {modalTab && <FakeModal tab={modalTab} onClose={onCloseModal} />}

      {snapshot.phase !== 'playing' && showInstallNudge && (
        <div className="pwa-nudge-overlay">
          <InstallNudgeCard onDismiss={dismissInstall} />
        </div>
      )}

      {snapshot.phase !== 'playing' && showNotificationNudge && !showInstallNudge && (
        <div className="pwa-nudge-overlay">
          <NotificationNudgeCard onDismiss={dismissNotification} />
        </div>
      )}
    </div>
  );
}
