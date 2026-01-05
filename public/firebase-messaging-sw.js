// Firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAUBdZZyyLDGThPhWAyNpBAcW8WyrN0nK8',
  authDomain: 'saydo-68f95.firebaseapp.com',
  projectId: 'saydo-68f95',
  storageBucket: 'saydo-68f95.firebasestorage.app',
  messagingSenderId: '1014278857822',
  appId: '1:1014278857822:web:78542b8b7e5f178e6180cf',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload)

  const notificationTitle = payload.notification?.title || 'Alert!'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new alert',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.alertId || 'alert',
    data: {
      alertId: payload.data?.alertId,
      url: '/',
    },
    // These options help wake up Android
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    renotify: true,
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)
  event.notification.close()

  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      return clients.openWindow(event.notification.data?.url || '/')
    })
  )
})
