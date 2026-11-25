const CACHE = "partes-erdella-v19";
const FIREBASE_ASSETS = [
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js"
];
const ASSETS = ["index.html?v=17", "styles.css?v=8", "data.js?v=2", "xlsx-export.js?v=4", "app.js?v=14", "manifest.webmanifest?v=17", "icon.svg", "icon-192.png", "icon-512.png", ...FIREBASE_ASSETS];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && /^partes-erdella-v\d+$/.test(key)).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && !FIREBASE_ASSETS.includes(url.href)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match("index.html?v=15"))));
});
