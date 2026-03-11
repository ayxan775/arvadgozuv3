import { registerSW } from 'virtual:pwa-register';

declare const __APP_VAPID_PUBLIC_KEY__: string;

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    let hasReloadedForController = false;

    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW: (_swUrl, registration) => {
        // Force update checks more aggressively so mobile clients pick up latest bundle.
        void registration?.update();

        const updateInterval = window.setInterval(() => {
          void registration?.update();
        }, 30_000);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            void registration?.update();
          }
        });

        window.addEventListener('beforeunload', () => {
          window.clearInterval(updateInterval);
        });
      },
      onNeedRefresh: () => {
        void updateSW(true);
      },
      onOfflineReady: () => {
        // App shell and static assets are ready for offline usage.
      },
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloadedForController) return;
      hasReloadedForController = true;
      window.location.reload();
    });

    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Service worker registration failed', error);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied' as const;
  }

  return Notification.requestPermission();
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export async function subscribeToPush(registration: ServiceWorkerRegistration) {
  if (!('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const vapidPublicKey =
    (import.meta as ImportMeta & { env?: { VITE_VAPID_PUBLIC_KEY?: string } }).env?.VITE_VAPID_PUBLIC_KEY ||
    __APP_VAPID_PUBLIC_KEY__;

  if (!vapidPublicKey) {
    throw new Error('VAPID public key is missing.');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) {
    throw new Error('Push subscription payload is incomplete.');
  }

  return {
    endpoint: json.endpoint,
    keys: {
      auth: json.keys.auth,
      p256dh: json.keys.p256dh,
    },
  };
}
