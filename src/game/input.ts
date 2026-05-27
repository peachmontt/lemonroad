import { smoothInput } from './lemon';
import type { InputState } from './types';

export function createInputState(): InputState {
  return {
    target: 0,
    smoothed: 0,
    keys: { left: false, right: false },
    dragX: null,
    isDragging: false,
    tiltX: 0,
    tiltGranted: false,
  };
}

export function computeInputTarget(
  input: InputState,
  canvasWidth: number,
  centerX: number,
): number {
  const maxSteeringDistance = canvasWidth / 2;

  if (input.isDragging && input.dragX !== null) {
    const steering = (input.dragX - centerX) / maxSteeringDistance;
    return Math.max(-1, Math.min(1, steering));
  }

  if (input.tiltGranted && Math.abs(input.tiltX) > 0.01) {
    return Math.max(-1, Math.min(1, input.tiltX));
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
