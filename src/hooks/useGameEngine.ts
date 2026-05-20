import { useEffect, useRef, useState, type RefObject } from 'react';
import { AudioManager } from '../game/audio';
import { GameEngine } from '../game/GameEngine';
import type { GameSnapshot } from '../game/types';

const defaultSnapshot: GameSnapshot = {
  phase: 'idle',
  distance: 0,
  juiceLevel: 'stable',
  citricVelocity: 1,
  activeEventLabel: null,
  muted: false,
};

export function useGameEngine(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(defaultSnapshot);
  const playStartedAt = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!audioRef.current) {
      audioRef.current = new AudioManager();
    }

    const engine = new GameEngine(canvas, audioRef.current);
    engine.setSnapshotCallback(setSnapshot);
    engineRef.current = engine;
    engine.startLoop();

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      engine.stopLoop();
      window.removeEventListener('resize', onResize);
    };
  }, [canvasRef]);

  return {
    engine: engineRef,
    audio: audioRef,
    snapshot,
    playDurationMs: () =>
      playStartedAt.current != null
        ? Date.now() - playStartedAt.current
        : 0,
    start: () => {
      playStartedAt.current = Date.now();
      engineRef.current?.start();
    },
    reset: () => {
      playStartedAt.current = null;
      engineRef.current?.reset();
    },
    setTilt: (x: number, granted: boolean) =>
      engineRef.current?.setTilt(x, granted),
    toggleMute: () => {
      const muted = audioRef.current?.toggleMute() ?? false;
      setSnapshot((s) => ({ ...s, muted }));
      return muted;
    },
  };
}
