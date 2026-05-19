/// <reference types="vite/client" />

interface DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}
