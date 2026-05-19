import { smoothInput } from './lemon';
import type { InputState } from './types';

export function createInputState(): InputState {
  return {
    target: 0,
    smoothed: 0,
    keys: { left: false, right: false },
    touchX: null,
    tiltX: 0,
    tiltGranted: false,
  };
}

export function computeInputTarget(
  input: InputState,
  mouseX: number | null,
  canvasWidth: number,
  canvasLeft: number,
): number {
  if (input.tiltGranted && Math.abs(input.tiltX) > 0.01) {
    return Math.max(-1, Math.min(1, input.tiltX));
  }

  if (input.touchX !== null) {
    const rel = (input.touchX - canvasWidth / 2) / (canvasWidth / 2);
    return Math.max(-1, Math.min(1, rel));
  }

  if (mouseX !== null) {
    const rel = (mouseX - canvasLeft - canvasWidth / 2) / (canvasWidth / 2);
    return Math.max(-1, Math.min(1, rel * 1.2));
  }

  let keyInput = 0;
  if (input.keys.left) keyInput -= 1;
  if (input.keys.right) keyInput += 1;
  return keyInput;
}

export function updateInputSmoothed(input: InputState, dt: number): number {
  input.smoothed = smoothInput(input.smoothed, input.target, dt);
  return input.smoothed;
}
