self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event with no data.');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Push data is not JSON:', event.data.text());
    data = {
      notification: {
        title: 'ZiniChat Notification',
        body: event.data.text()
      }
    };
  }

  const { title, body, icon, badge, vibrate, sound, data: extraData } = data.notification || {};

  const options = {
    body: body || '',
    icon: icon || '/logo.png',
    badge: badge || '/icon.png',
    vibrate: vibrate || [100, 50, 100],
    data: extraData || {},
  };

  // Setting custom sound file path if available
  if (sound) {
    options.sound = sound;
  }

  event.waitUntil(
    self.registration.showNotification(title || 'ZiniChat Alert', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Focus existing dashboard window or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
