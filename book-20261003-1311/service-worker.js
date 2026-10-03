/* 离线缓存：先缓存框架，再在后台缓存全部页面
   阅读器文件带版本号（?v=版本），每次重新发布都会换成新文件，不会一直显示旧版 */
var VERSION = '20261003-1311-21u9';
var CACHE = 'ebook-' + VERSION;
var V = '?v=' + encodeURIComponent(VERSION);
var CORE = ['./', './index.html', './viewer.css' + V, './viewer.js' + V, './book.json', './manifest.json',
  './lib/page-flip.browser.js' + V, './lib/qrcode.js' + V, './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(CORE.map(function (u) { return new Request(u, { cache: 'no-cache' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('ebook-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }).then(cacheAllPages));
});

function cacheAllPages() {
  return caches.open(CACHE).then(function (c) {
    return c.match('./book.json').then(function (r) { return r ? r.json() : null; }).then(function (b) {
      if (!b) return;
      var urls = [];
      for (var i = 1; i <= b.pages; i++) { urls.push('./pages/' + i + '.' + (b.ext || 'jpg')); urls.push('./thumbs/' + i + '.jpg'); }
      // 逐个缓存，避免一次请求过多
      return urls.reduce(function (p, u) {
        return p.then(function () { return c.match(u).then(function (hit) { return hit || c.add(u).catch(function () {}); }); });
      }, Promise.resolve());
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  var url = new URL(req.url);
  if (req.mode === 'navigate' || /book\.json$/.test(url.pathname)) {
    // 网页和书籍信息：网络优先，并跳过浏览器 / CDN 的旧缓存；离线时才用本地缓存
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
      if (res.redirected) return fetch(req);
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('./index.html'); });
    }));
    return;
  }
  // 其余静态资源（带版本号的阅读器文件、页面图片）：缓存优先，按完整网址匹配
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
