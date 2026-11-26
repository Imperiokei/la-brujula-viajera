// La Brújula Viajera · service worker. La línea VERSION la cambia herramientas/version.mjs en cada publicación:
// así el celular se entera de que hay app nueva y ofrece «Actualizar» sin reinstalar nada.
const VERSION = '1.0.17-202611250035';
const CASCARA = 'bv-app-' + VERSION;
const CONTENIDO = 'bv-contenido';
const FOTOS = 'bv-fotos';
const ARCHIVOS = ['./', 'index.html', 'app.css', 'app.js', 'i18n.js', 'manifest.webmanifest', 'version.json', 'img/logo.svg',
  'img/icono-192.png', 'img/icono-512.png', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/fonts/inter.woff2', 'vendor/fonts/fraunces.woff2', 'contenido/paises.json', 'contenido/tienda.json'];

self.addEventListener('install', e => e.waitUntil(caches.open(CASCARA).then(c => c.addAll(ARCHIVOS))));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('bv-app-') && k !== CASCARA) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', e => {
  if (e.data === 'saltar') self.skipWaiting();
  if (e.data === 'limpiar-contenido') caches.delete(CONTENIDO);
});

async function primeroRed(req, cache) {
  try {
    const r = await fetch(req);
    if (r.ok) (await caches.open(cache)).put(req, r.clone());
    return r;
  } catch {
    const c = await caches.match(req);
    if (c) return c;
    throw new Error('sin conexión');
  }
}
async function primeroCache(req, cache) {
  const c = await caches.match(req);
  if (c) return c;
  const r = await fetch(req);
  if (r.ok) (await caches.open(cache)).put(req, r.clone());
  return r;
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // mapas de OSM y POST van directo
  const p = url.pathname;
  if (p.startsWith('/api/version') || p.startsWith('/api/donde') || p.startsWith('/api/permiso') || p.startsWith('/api/yo')
    || p.startsWith('/api/resenas') || p.startsWith('/api/clima') || p.startsWith('/auth/')) return; // siempre en vivo, nunca en caché
  if (p.startsWith('/api/provincia/')) return e.respondWith(primeroRed(e.request, CONTENIDO));
  if (p.includes('/fotos/')) return e.respondWith(primeroCache(e.request, FOTOS));
  if (p.endsWith('.json')) return e.respondWith(primeroRed(e.request, CONTENIDO));
  if (e.request.mode === 'navigate') return e.respondWith(fetch(e.request).catch(() => caches.match('index.html')));
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
