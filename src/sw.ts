/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// PWA precaching
precacheAndRoute(self.__WB_MANIFEST);

// ============================================
// PUSH NOTIFICATION HANDLER
// ============================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title: string; body: string; data?: any };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'TS ERP', body: event.data.text() };
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
    tag: 'ts-erp-notification',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ============================================
// NOTIFICATION CLICK — appni ochish
// ============================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // App allaqachon ochiq bo'lsa — focus qilish
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Yopiq bo'lsa — yangi oyna ochish
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// ============================================
// SKIP WAITING — yangi versiya kelganda
// ============================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});