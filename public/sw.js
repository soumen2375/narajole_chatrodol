// Narajole Chatrodol — Push Notifications Service Worker
// This service worker enables push subscription from the browser.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Narajole Chatrodol', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/assets/images/favicon/android-chrome-192x192.png',
    badge: '/assets/images/favicon/favicon-32x32.png',
    data: data.url ? { url: data.url } : {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Narajole Chatrodol', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
