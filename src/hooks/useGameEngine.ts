import { useEffect, useRef, useState, type RefObject } from 'react';
import { AudioManager } from '../game/audio';
import { GameEngine } from '../game/GameEngine';
import { getProgress } from '../game/progression';
import type { GameSnapshot, RunSummary } from '../game/types';

const defaultSnapshot: GameSnapshot = {
  phase: 'idle',
  distance: 0,
  bonusScore: 0,
  dodgeStreak: 0,
  juiceLevel: 'stable',
  citricVelocity: 1,
  activeEventLabel: null,
  biomePhase: 'tutorial',
  muted: false,
};

export function useGameEngine(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onRunEnd?: (summary: RunSummary) => void,
) {
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(defaultSnapshot);
  const playStartedAt = useRef<number | null>(null);
  const onRunEndRef = useRef(onRunEnd);

  useEffect(() => {
    onRunEndRef.current = onRunEnd;
  }, [onRunEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!audioRef.current) {
      audioRef.current = new AudioManager();
    }

    const engine = new GameEngine(canvas, audioRef.current);
    engine.setSnapshotCallback(setSnapshot);
    engine.setRunEndCallback((summary) => {
      onRunEndRef.current?.(summary);
    });
    engine.setSelectedSkin(getProgress().selectedSkin);
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
      engineRef.current?.setSelectedSkin(getProgress().selectedSkin);
      engineRef.current?.start();
    },
    reset: () => {
      playStartedAt.current = null;
      engineRef.current?.reset();
      engineRef.current?.setSelectedSkin(getProgress().selectedSkin);
    },
    setTilt: (x: number, granted: boolean) =>
      engineRef.current?.setTilt(x, granted),
    toggleMute: () => {
      const muted = audioRef.current?.toggleMute() ?? false;
      setSnapshot((s) => ({ ...s, muted }));
      return muted;
    },
    setSelectedSkin: (skinId: string) => {
      engineRef.current?.setSelectedSkin(skinId);
    },
  };
}
