import { useEffect, useRef, useState } from 'react';
import { subscribePush, unsubscribePush } from '../lib/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';


export interface UsePushNotificationsReturn {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  requestAndSubscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    supported ? Notification.permission : 'unsupported',
  );
  const [subscribed, setSubscribed] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  // Register service worker on mount
  useEffect(() => {
    if (!supported || !VAPID_PUBLIC_KEY) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        swRef.current = reg;
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(!!existing);
      })
      .catch(() => null);
  }, [supported]);

  const requestAndSubscribe = async (): Promise<boolean> => {
    if (!supported || !VAPID_PUBLIC_KEY) return false;

    const reg = swRef.current ?? (await navigator.serviceWorker.ready);
    swRef.current = reg;

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    });

    const key = sub.getKey('p256dh');
    const auth = sub.getKey('auth');
    if (!key || !auth) return false;

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
    const authStr = btoa(String.fromCharCode(...new Uint8Array(auth)));

    await subscribePush({ endpoint: sub.endpoint, p256dh, auth: authStr });
    setSubscribed(true);
    return true;
  };

  const unsubscribe = async (): Promise<void> => {
    if (!supported) return;
    const reg = swRef.current ?? (await navigator.serviceWorker.ready);
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await unsubscribePush(sub.endpoint);
    await sub.unsubscribe();
    setSubscribed(false);
  };

  return { supported, permission, subscribed, requestAndSubscribe, unsubscribe };
}
