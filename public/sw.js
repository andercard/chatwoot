/* eslint-disable no-restricted-globals, no-console */
/* globals clients */
const NOTIFICATION_ICON = '/android-icon-192x192.png';

// Browsers (Safari/iOS especially) require every push to end in a visible
// notification, otherwise the subscription can be revoked. Never throw here.
const parsePayload = event => {
  try {
    return (event.data && event.data.json()) || {};
  } catch (error) {
    return {};
  }
};

self.addEventListener('push', event => {
  const notification = parsePayload(event);

  event.waitUntil(
    self.registration.showNotification(notification.title || 'Chatwoot', {
      tag: notification.tag,
      icon: NOTIFICATION_ICON,
      data: {
        url: notification.url || self.location.origin,
      },
    })
  );
});

self.addEventListener('notificationclick', event => {
  const { url } = event.notification.data;
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async windowClients => {
        const appWindow =
          windowClients.find(client => client.url === url) ||
          windowClients.find(client =>
            client.url.startsWith(self.location.origin)
          );

        if (appWindow && 'focus' in appWindow) {
          await appWindow.focus();
          if (appWindow.url !== url && 'navigate' in appWindow) {
            await appWindow.navigate(url);
          }
          return;
        }
        if (clients.openWindow) {
          await clients.openWindow(url);
        }
      })
  );
});

// The browser rotated the push subscription. Recreate it so the dashboard
// registers the new endpoint on its next load (see App.vue).
self.addEventListener('pushsubscriptionchange', event => {
  const { oldSubscription } = event;
  if (!oldSubscription || !oldSubscription.options) return;

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: oldSubscription.options.applicationServerKey,
    })
  );
});
