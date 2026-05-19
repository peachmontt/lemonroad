import { useRef } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { DeathOverlay } from './DeathOverlay';
import { FakeModal, type ModalTab } from './FakeModal';
import { HudOverlay } from './HudOverlay';
import { StartOverlay } from './StartOverlay';
import { useDeviceTilt } from '../hooks/useDeviceTilt';
import { useState, useCallback } from 'react';

interface GameCanvasProps {
  modalTab: ModalTab | null;
  onOpenModal: (tab: ModalTab) => void;
  onCloseModal: () => void;
}

export function GameCanvas({ modalTab, onOpenModal, onCloseModal }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { snapshot, start, reset, setTilt, toggleMute } = useGameEngine(canvasRef);
  const [tiltMsg, setTiltMsg] = useState<string | null>(null);

  const onTilt = useCallback(
    (x: number) => setTilt(x, true),
    [setTilt],
  );

  const { status, needsPermission, requestTilt } = useDeviceTilt(onTilt);

  const handleStart = async () => {
    if (needsPermission && status !== 'granted') {
      const ok = await requestTilt();
      if (!ok) {
        setTiltMsg('tilt denied. use finger like a peasant.');
      } else {
        setTilt(0, true);
      }
    }
    start();
  };

  const handleRetry = () => {
    reset();
    setTiltMsg(null);
  };

  return (
    <div className="game-root">
      <canvas ref={canvasRef} className="game-canvas" />

      {snapshot.phase === 'playing' && (
        <HudOverlay
          snapshot={snapshot}
          onToggleMute={toggleMute}
        />
      )}

      {snapshot.phase === 'idle' && (
        <StartOverlay
          onStart={handleStart}
          onOpenModal={onOpenModal}
          tiltMsg={tiltMsg}
          needsTilt={needsPermission && status !== 'granted'}
        />
      )}

      {(snapshot.phase === 'dying' || snapshot.phase === 'dead') && (
        <DeathOverlay
          snapshot={snapshot}
          onRetry={handleRetry}
        />
      )}

      {modalTab && <FakeModal tab={modalTab} onClose={onCloseModal} />}
    </div>
  );
}
