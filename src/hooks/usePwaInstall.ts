import { useCallback, useEffect, useRef, useState } from 'react';
import { getPlatform, isInAppBrowser, isStandalone } from '../lib/pwa/platform';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallStatus = 'idle' | 'available' | 'installed' | 'dismissed';

export interface UsePwaInstallReturn {
  canNativeInstall: boolean;
  installStatus: InstallStatus;
  isStandaloneMode: boolean;
  platform: 'ios' | 'android' | 'other';
  isInApp: boolean;
  promptInstall: () => Promise<void>;
  copySiteLink: () => Promise<boolean>;
}

export function usePwaInstall(): UsePwaInstallReturn {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canNativeInstall, setCanNativeInstall] = useState(false);
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');
  const standaloneRef = useRef(isStandalone());

  useEffect(() => {
    if (standaloneRef.current) {
      setInstallStatus('installed');
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanNativeInstall(true);
      setInstallStatus('available');
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanNativeInstall(false);
      setInstallStatus('installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPromptRef.current = null;
    setCanNativeInstall(false);

    if (outcome === 'accepted') {
      setInstallStatus('installed');
    } else {
      setInstallStatus('dismissed');
    }
  }, []);

  const copySiteLink = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText('https://www.lemonroad.xyz');
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    canNativeInstall,
    installStatus,
    isStandaloneMode: standaloneRef.current,
    platform: getPlatform(),
    isInApp: isInAppBrowser(),
    promptInstall,
    copySiteLink,
  };
}
