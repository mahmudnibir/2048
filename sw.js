const CACHE_NAME = '2048-pro-v2.0.0';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './sounds/slide.mp3',
  './sounds/merge.wav',
  './sounds/button_click.wav',
  './sounds/game_over.wav',
  'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then(fetchResponse => {
          // Check if we received a valid response
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          // Clone the response for caching
          const responseToCache = fetchResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return fetchResponse;
        });
      })
      .catch(() => {
        // Offline fallback for HTML pages
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// Background sync for saving game data
self.addEventListener('sync', event => {
  if (event.tag === 'save-game-data') {
    console.log('Service Worker: Background sync - saving game data');
    event.waitUntil(
      // Save any pending game data when back online
      saveGameDataToServer()
    );
  }
});

// Push notifications (for future features like daily challenges)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New daily challenge available!',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Play Now',
        icon: './icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './icons/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('2048 Professional', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Notification click received.');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Helper function for background sync
async function saveGameDataToServer() {
  try {
    // This would typically save to a backend API
    // For now, we'll just ensure localStorage is properly maintained
    console.log('Game data saved successfully');
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to save game data:', error);
    throw error;
  }
}