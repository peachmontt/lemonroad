import { useRef, useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount } from 'wagmi';
import { useGameEngine } from '../hooks/useGameEngine';
import { usePaidAttempt } from '../hooks/usePaidAttempt';
import { useEvmPaidAttempt } from '../hooks/useEvmPaidAttempt';
import { usePlayer } from '../hooks/usePlayer';
import type { GameMode } from '../types/game';
import { trackGameStart, trackWalletConnect, trackPaidDeposit, trackPaymentError } from '../lib/analytics';
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
  const [paymentMethod, setPaymentMethod] = useState<'solana' | 'evm'>('solana');
  const [activeMode, setActiveMode] = useState<GameMode>('free');
  const [activeDepositTx, setActiveDepositTx] = useState<string | null>(null);
  const [activeWalletKey, setActiveWalletKey] = useState<string | null>(null);
  const [activePaymentChain, setActivePaymentChain] = useState<'solana' | 'evm'>('solana');

  const { publicKey } = useWallet();
  const { address: evmAddress } = useAccount();

  // Track wallet connects
  useEffect(() => {
    if (publicKey) trackWalletConnect(publicKey.toBase58());
  }, [publicKey]);
  useEffect(() => {
    if (evmAddress) trackWalletConnect(evmAddress);
  }, [evmAddress]);

  const { player, runs, setDisplayName, reloadRuns } = usePlayer();
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

  const handleStart = () => {
    void beginRun();
  };

  const handleStartPaid = async () => {
    if (paymentMethod === 'evm') {
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

  const handleRetry = () => {
    reset();
    resetPaid();
    evmResetPaid();
    setActiveDepositTx(null);
    setActiveWalletKey(null);
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
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onStart={handleStart}
          onStartPaid={() => void handleStartPaid()}
          onOpenModal={onOpenModal}
          tiltMsg={tiltMsg}
          needsTilt={needsPermission && status !== 'granted'}
          player={player}
          runs={runs}
          onSaveName={setDisplayName}
          paidPending={paidPending || evmPending}
          paidError={paidError ?? evmError}
          hasPaidDeposit={paymentMethod === 'evm' ? !!evmDepositTx : !!depositTx}
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
          onRetry={handleRetry}
          onRunSaved={() => {
            void reloadRuns();
            resetPaid();
            evmResetPaid();
            setActiveDepositTx(null);
            setActiveWalletKey(null);
          }}
        />
      )}

      {modalTab && <FakeModal tab={modalTab} onClose={onCloseModal} />}
    </div>
  );
}
