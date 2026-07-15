// FuCRM service worker — app instalável e que abre offline (cache do app shell).
const CACHE = 'fucrm-shell-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return // não intercepta Supabase/APIs

  // Navegação (SPA): rede primeiro, cai para index.html em cache se offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))))
    return
  }
  // Estáticos: cache primeiro, atualiza em segundo plano
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res }).catch(() => cached)
      return cached || net
    }),
  )
})
