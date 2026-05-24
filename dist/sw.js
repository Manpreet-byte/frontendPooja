/* global self */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { body: event.data ? event.data.text() : '' };
    } catch {
      data = {};
    }
  }

  const title = data.title || 'Love & Flour';
  const assetBase = self.registration && self.registration.scope ? self.registration.scope : '/';
  const iconUrl = new URL('favicon.svg', assetBase).toString();
  const options = {
    body: data.body || '',
    tag: data.tag || undefined,
    data: { url: data.url || '/', raw: data.data || null },
    icon: iconUrl,
    badge: iconUrl,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification?.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) return client.navigate(url);
            return client;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
        return null;
      }),
  );
});
