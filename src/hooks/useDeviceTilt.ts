import { useCallback, useEffect, useState } from 'react';

export type TiltStatus = 'unsupported' | 'prompt' | 'granted' | 'denied';

export function useDeviceTilt(onTilt: (x: number) => void) {
  const [status, setStatus] = useState<TiltStatus>('prompt');
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasOrientation = 'DeviceOrientationEvent' in window;
    if (!hasOrientation) {
      setStatus('unsupported');
      return;
    }
    const req = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission;
    setNeedsPermission(typeof req === 'function');
  }, []);

  const requestTilt = useCallback(async (): Promise<boolean> => {
    if (status === 'granted') return true;
    if (status === 'unsupported') return false;

    const DEO = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DEO.requestPermission === 'function') {
      try {
        const result = await DEO.requestPermission();
        if (result === 'granted') {
          setStatus('granted');
          return true;
        }
        setStatus('denied');
        return false;
      } catch {
        setStatus('denied');
        return false;
      }
    }

    setStatus('granted');
    return true;
  }, [status]);

  useEffect(() => {
    if (status !== 'granted') return;

    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const normalized = Math.max(-1, Math.min(1, gamma / 30));
      onTilt(normalized);
    };

    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, [status, onTilt]);

  return { status, needsPermission, requestTilt };
}
