import { useRef, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { usePaidAttempt } from '../hooks/usePaidAttempt';
import { usePlayer } from '../hooks/usePlayer';
import type { GameMode } from '../types/game';
import { DeathOverlay } from './DeathOverlay';
import { FakeModal, type ModalTab } from './FakeModal';
import { HudOverlay } from './HudOverlay';
import { StartOverlay } from './StartOverlay';
import { useDeviceTilt } from '../hooks/useDeviceTilt';

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
  const [activeMode, setActiveMode] = useState<GameMode>('free');
  const [activeDepositTx, setActiveDepositTx] = useState<string | null>(null);

  const { publicKey } = useWallet();
  const { player, runs, setDisplayName, reloadRuns } = usePlayer();
  const {
    pending: paidPending,
    depositTx,
    error: paidError,
    payForAttempt,
    reset: resetPaid,
  } = usePaidAttempt();

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
    start();
  };

  const handleStart = () => {
    void beginRun();
  };

  const handleStartPaid = async () => {
    if (!publicKey) return;

    let tx = depositTx;
    if (!tx) {
      tx = await payForAttempt();
      if (!tx) return;
    }

    setActiveDepositTx(tx);
    await beginRun();
  };

  const handleRetry = () => {
    reset();
    resetPaid();
    setActiveDepositTx(null);
    setTiltMsg(null);
  };

  return (
    <div className="game-root">
      <canvas ref={canvasRef} className="game-canvas" />

      {snapshot.phase === 'playing' && (
        <HudOverlay snapshot={snapshot} onToggleMute={toggleMute} />
      )}

      {snapshot.phase === 'idle' && (
        <StartOverlay
          gameMode={gameMode}
          onGameModeChange={setGameMode}
          onStart={handleStart}
          onStartPaid={() => void handleStartPaid()}
          onOpenModal={onOpenModal}
          tiltMsg={tiltMsg}
          needsTilt={needsPermission && status !== 'granted'}
          player={player}
          runs={runs}
          onSaveName={setDisplayName}
          paidPending={paidPending}
          paidError={paidError}
          hasPaidDeposit={!!depositTx}
        />
      )}

      {(snapshot.phase === 'dying' || snapshot.phase === 'dead') && (
        <DeathOverlay
          snapshot={snapshot}
          gameMode={activeMode}
          playDurationMs={playDurationMs()}
          depositTx={activeDepositTx}
          walletPubkey={publicKey?.toBase58() ?? null}
          onRetry={handleRetry}
          onRunSaved={() => {
            void reloadRuns();
            resetPaid();
            setActiveDepositTx(null);
          }}
        />
      )}

      {modalTab && <FakeModal tab={modalTab} onClose={onCloseModal} />}
    </div>
  );
}
