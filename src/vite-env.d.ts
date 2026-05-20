/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_SOLANA_CLUSTER?: string;
  readonly VITE_PROGRAM_ID?: string;
  readonly VITE_USDT_MINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}
