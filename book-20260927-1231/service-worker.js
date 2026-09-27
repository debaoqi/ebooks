/* 离线缓存：先缓存框架，再在后台缓存全部页面 */
var VERSION = '20260927-1231-21ie';
var CACHE = 'ebook-' + VERSION;
var CORE = ['./', './index.html', './viewer.css', './viewer.js', './book.json', './manifest.json',
  './lib/page-flip.browser.js', './lib/qrcode.js', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
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
  var isPage = req.mode === 'navigate' || /book\.json$/.test(url.pathname);
  if (isPage) {
    // 网络优先：保证内容更新；离线时用缓存
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('./index.html'); }); }));
    return;
  }
  // 其余静态资源：缓存优先
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
