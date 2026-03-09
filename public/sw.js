// Configurazione base del Service Worker
const CACHE_NAME = "walkshoes-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/style.css",
  "/app.js"
];

// Installazione: caching iniziale
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache aperta");
      // Falliscono i file non esistenti, ma l'impalcatura resta
      return cache.addAll(urlsToCache).catch(err => console.log('Asset mancanti saltati during install', err));
    })
  );
  self.skipWaiting();
});

// Attivazione e pulizia vecchie cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Eliminando vecchia cache", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercettazione fetch per servire i file online/offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Se troviamo una response in cache, la serviamo
      if (response) {
        return response;
      }
      
      // Altrimenti tentiamo il fetch remoto
      return fetch(event.request).catch(() => {
        // Fallback offline qui (se implementabile)
        console.log("Nessuna rete disponibile per", event.request.url);
      });
    })
  );
});

// Background Sync per inviare i dati delle sessioni (es. se la connessione è stata assente)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sessions') {
    event.waitUntil(syncSessionsToFirestore());
  }
});

async function syncSessionsToFirestore() {
  // Esempio logico di sincronizzazione di fine sessione in differita
  console.log("[Service Worker] Background sync: invio dati sessione in corso verso Firestore...");
  // Qui andrebbe letto il DB locale IndexedDB e si invierebbero i dati ad una cloud func o API
  // localDB.getUnsyncedSession().then(session => fetch('/api/sync', ...))
}
