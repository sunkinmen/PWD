/* sw.js ── 離線快取（PWA）
 * 策略：網頁／程式／內容「網路優先」（上傳新版自動生效，離線時用快取）；圖片音檔「快取優先」（第二次開啟秒開）
 * 更換大量圖片後，把 VERSION 改個數字即可清掉舊圖快取 */
const VERSION = 'pwd3d-v8';
const CORE = [
  './', './index.html', './css/style.css', './manifest.json',
  './js/vendor/three.min.js', './js/content.js', './js/content-en.js', './js/i18n.js', './js/emblems.js',
  './js/extras.js', './js/world.js', './js/audio.js', './js/icons.js', './js/pwd-portal.js', './js/ui.js',
  './brand.html', './assets/sky-taipei.jpg', './assets/tex/levee-mural.jpg', './assets/icons/icon-192.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isMedia = /\.(jpg|jpeg|png|webp|mp3|svg)$/i.test(url.pathname);
  const sameOrFont = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrFont) return;                       // 試算表、GA 等外部請求不快取
  if (isMedia || url.hostname.includes('gstatic')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return res; })));
  } else {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return res; }).catch(() => caches.match(req).then(h => h || caches.match('./index.html'))));
  }
});
