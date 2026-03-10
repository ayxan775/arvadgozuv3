/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
    }),
);

registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'worker',
    new StaleWhileRevalidate({
        cacheName: 'static-resources',
    }),
);

registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
        cacheName: 'image-cache',
    }),
);

const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(
    new NavigationRoute(navigationHandler, {
        denylist: [/^\/api\//],
    }),
);

self.addEventListener('push', (event) => {
    const payload = (() => {
        try {
            return event.data?.json();
        } catch {
            return null;
        }
    })() as { title?: string; body?: string; data?: Record<string, unknown> } | null;

    event.waitUntil(
        self.registration.showNotification(payload?.title ?? 'Ortaq Maliyyə', {
            body: payload?.body ?? 'Yeni bildiriş var',
            icon: '/icon.svg',
            badge: '/icon.svg',
            data: payload?.data ?? {},
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            const client = clients[0];

            if (client) {
                return client.focus();
            }

            return self.clients.openWindow('/notifications');
        }),
    );
});

self.addEventListener('message', (event) => {
    if (event.data && (event.data as { type?: string }).type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
