/* 电子书阅读器 — 由 ebook-maker 生成 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var BOOK = null;          // book.json
  var pf = null;            // PageFlip 实例
  var mode = null;          // 'landscape' | 'portrait'
  var portraitMinW = 0;
  var cur = 0;
  var SADDLE = false;      // 装订方式：true 骑马订，false 胶装              // 当前页（0 基）
  var autoTimer = null;
  var soundOn = true;
  var deferredInstall = null;
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isWeChat = /MicroMessenger/i.test(ua);
  var isQQ = /\sQQ\/|MQQBrowser.*\sQQ/i.test(ua);
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var PREVIEW = window.__EB_FILES__ || null;   // 生成器内预览时，文件以 blob: 地址提供
  function res(p) { return (PREVIEW && PREVIEW[p]) || p; }
  function pageSrc(i) { return res('pages/' + (i + 1) + '.' + (BOOK.ext || 'jpg')); }
  function thumbSrc(i) { return res('thumbs/' + (i + 1) + '.jpg'); }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 1800); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 中英文切换 ---------- */
  var I18N = {
    zh: {
      loading: '加载中…', loadFail: '加载失败：',
      prev: '上一页', next: '下一页', first: '第一页', last: '最后一页',
      prevKey: '上一页 (←)', nextKey: '下一页 (→)', firstKey: '第一页 (Home)', lastKey: '最后一页 (End)',
      home: '首页', zoomIn: '放大', zoomOut: '缩小', zoomClose: '关闭缩放', pageNo: '页码',
      search: '搜索', thumbs: '缩略图', more: '更多', close: '关闭',
      langBtn: 'EN', langTip: 'Switch to English', langToast: '已切换为中文',
      fullscreen: '全屏', autoplay: '自动翻页', autoStop: '停止自动翻页', autoStarted: '自动翻页已开始',
      soundOn: '翻页声音：开', soundOff: '翻页声音：关', soundOnToast: '已开启翻页声音', soundOffToast: '已关闭翻页声音',
      shareMenu: '分享 / 二维码', installMenu: '安装到手机 / 桌面', downloadPdf: '下载 PDF', noFullscreen: '当前浏览器不支持全屏',
      searchPh: '输入关键词或页码', pageN: '第 {n} 页', jumped: '已跳转到第 {n} 页', found: '找到 {n} 页',
      notFound: '没有找到“{q}”', noText: '本书没有文字索引（由图片生成），可输入页码跳转',
      scanToRead: '扫码阅读', fromThisPage: '从当前页打开', copyLink: '复制链接', saveQr: '保存二维码', shareDots: '分享…',
      copied: '链接已复制', qrFile: '-二维码.png', localTip: '提示：当前是本地地址，发布到网上后二维码才能被手机访问',
      installTitle: '安装到手机', install: '安装', installBar: '将《{name}》安装到手机，离线也能看',
      installed: '已安装到主屏幕', alreadyApp: '已经是安装后的应用', installing: '正在安装…',
      instWechat: '<p>微信 / QQ 内置浏览器不支持安装。</p><ol><li>点击右上角 <b>···</b></li><li>选择 <b>在浏览器中打开</b>（推荐 Chrome）</li><li>在浏览器中再次点击“安装到手机”</li></ol>',
      instIOS: '<p>在 iPhone / iPad 上用 <b>Safari</b> 安装：</p><ol><li>点击底部的 <b>分享</b> 按钮 <span style="font-size:18px">⎋</span></li><li>向下滑动，选择 <b>添加到主屏幕</b></li><li>点击右上角 <b>添加</b></li></ol>',
      instHttps: '<p>安装功能需要 <b>HTTPS</b> 网址。请把电子书发布到 HTTPS 网站（如 GitHub Pages）后再试。</p>',
      instChrome: '<p>用 <b>Chrome</b> 浏览器安装：</p><ol><li>点击右上角菜单 <b>⋮</b></li><li>选择 <b>添加到主屏幕</b> 或 <b>安装应用</b></li><li>确认 <b>安装</b></li></ol><p style="color:#888;font-size:13px">安装后可像 App 一样从桌面打开，已看过的页面离线也能阅读。</p>'
    },
    en: {
      loading: 'Loading…', loadFail: 'Failed to load: ',
      prev: 'Previous page', next: 'Next page', first: 'First page', last: 'Last page',
      prevKey: 'Previous page (←)', nextKey: 'Next page (→)', firstKey: 'First page (Home)', lastKey: 'Last page (End)',
      home: 'Cover', zoomIn: 'Zoom in', zoomOut: 'Zoom out', zoomClose: 'Close zoom', pageNo: 'Page',
      search: 'Search', thumbs: 'Thumbnails', more: 'More', close: 'Close',
      langBtn: '中', langTip: '切换到中文', langToast: 'Switched to English',
      fullscreen: 'Full screen', autoplay: 'Auto flip', autoStop: 'Stop auto flip', autoStarted: 'Auto flip started',
      soundOn: 'Flip sound: On', soundOff: 'Flip sound: Off', soundOnToast: 'Flip sound on', soundOffToast: 'Flip sound off',
      shareMenu: 'Share / QR code', installMenu: 'Install on phone / desktop', downloadPdf: 'Download PDF', noFullscreen: 'Full screen is not supported in this browser',
      searchPh: 'Keyword or page number', pageN: 'Page {n}', jumped: 'Jumped to page {n}', found: 'Found on {n} page(s)',
      notFound: 'No results for “{q}”', noText: 'This book has no text index (made from images). Enter a page number to jump.',
      scanToRead: 'Scan to read', fromThisPage: 'Open at current page', copyLink: 'Copy link', saveQr: 'Save QR code', shareDots: 'Share…',
      copied: 'Link copied', qrFile: '-QR.png', localTip: 'Note: this is a local address. Publish online so phones can open the QR code.',
      installTitle: 'Install on your phone', install: 'Install', installBar: 'Install “{name}” on your phone and read offline',
      installed: 'Installed to home screen', alreadyApp: 'Already running as an installed app', installing: 'Installing…',
      instWechat: '<p>WeChat / QQ in-app browsers cannot install apps.</p><ol><li>Tap <b>···</b> at the top right</li><li>Choose <b>Open in browser</b> (Chrome recommended)</li><li>Tap “Install on phone” again in the browser</li></ol>',
      instIOS: '<p>On iPhone / iPad, install with <b>Safari</b>:</p><ol><li>Tap the <b>Share</b> button at the bottom <span style="font-size:18px">⎋</span></li><li>Scroll down and choose <b>Add to Home Screen</b></li><li>Tap <b>Add</b> at the top right</li></ol>',
      instHttps: '<p>Installing requires an <b>HTTPS</b> address. Publish the ebook to an HTTPS site (e.g. GitHub Pages) and try again.</p>',
      instChrome: '<p>Install with <b>Chrome</b>:</p><ol><li>Tap the menu <b>⋮</b> at the top right</li><li>Choose <b>Add to Home screen</b> or <b>Install app</b></li><li>Confirm <b>Install</b></li></ol><p style="color:#888;font-size:13px">Once installed it opens like an app from your home screen, and pages you have viewed can be read offline.</p>'
    }
  };
  /* 语言优先级：
     1. 网址 ?lang=en / zh
     2. 读者在本书当前默认语言下亲自点选过的语言（作者改了默认语言后，旧的选择自动作废）
     3. 生成时设定的默认语言（book.json 的 defaultLang）
     4. 浏览器语言
     书籍信息加载前先按网址 / 浏览器语言显示“加载中”，加载后由 resolveLang() 最终确定 */
  var URL_LANG = (function () { var q = /[?&]lang=(zh|en)/i.exec(location.search); return q ? q[1].toLowerCase() : null; })();
  var LANG = URL_LANG || (/^zh/i.test(navigator.language || '') ? 'zh' : 'en');
  function bookDefault() { return (BOOK && (BOOK.defaultLang === 'zh' || BOOK.defaultLang === 'en')) ? BOOK.defaultLang : 'auto'; }
  function resolveLang() {
    if (URL_LANG) return URL_LANG;
    var saved = null;
    try { saved = JSON.parse(store('eb-lang2') || 'null'); } catch (e) {}
    if (saved && (saved.l === 'zh' || saved.l === 'en') && saved.d === bookDefault()) return saved.l;
    if (bookDefault() !== 'auto') return bookDefault();
    return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
  }
  function t(key, vars) {
    var str = (I18N[LANG] && I18N[LANG][key]) || I18N.zh[key] || key;
    if (vars) str = str.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return str;
  }
  function applyLang() {
    document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = t(el.getAttribute('data-i18n-title')); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    if (typeof BOOK !== 'undefined' && BOOK) {
      $('installBarText').innerHTML = esc(t('installBar', { name: '\u0000' })).replace('\u0000', '<b>' + esc(BOOK.shortTitle || BOOK.title) + '</b>');
      document.querySelectorAll('#book img[data-i]').forEach(function (img) { img.alt = t('pageN', { n: +img.getAttribute('data-i') + 1 }); });
    }
    if (typeof updateSoundLabel === 'function') { updateSoundLabel(); updateAutoLabel(); }
  }
  function setLang(l) {
    LANG = l; store('eb-lang2', JSON.stringify({ l: l, d: bookDefault() }));
    applyLang();
    // 已打开的搜索结果和安装说明也立即换成新语言
    if (!$('searchPanel').hidden && $('searchInput').value.trim()) $('searchForm').dispatchEvent(new Event('submit', { cancelable: true }));
    if (!$('installDlg').hidden) openInstall();
    toast(t('langToast'));
  }
  applyLang();   // 加载中提示等静态文字先按当前语言显示

  /* ---------- 启动 ---------- */
  fetch(res('book.json'), { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (b) {
    BOOK = b;
    document.title = b.title;
    SADDLE = b.binding === 'saddle';
    LANG = resolveLang();
    $('app').classList.add(SADDLE ? 'bind-saddle' : 'bind-perfect');
    applyLang();
    $('slider').max = b.pages;
    document.documentElement.style.setProperty('--ratio', b.width + '/' + b.height);
    if (b.pdf) { b.pdf = res(b.pdf); $('downloadItem').hidden = false; }
    soundOn = store('eb-sound') !== '0';
    updateSoundLabel();
    var start = readHash();
    build(start);
    buildThumbs();
    $('loading').hidden = true;
    setupInstall();
  }).catch(function (e) {
    $('loadingText').textContent = t('loadFail') + e.message;
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !PREVIEW) {
    // 重新发布后新版本接管时自动刷新一次，读者不会停留在旧版
    var hadController = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' }).then(function (reg) { reg.update(); }).catch(function () {});
  }

  /* ---------- 尺寸 / 构建 ---------- */
  function layout() {
    var wrap = $('bookWrap');
    var W = wrap.clientWidth, H = wrap.clientHeight, r = BOOK.width / BOOK.height;
    var pwL = Math.min(W / 2, H * r), pwP = Math.min(W, H * r);
    var m = (W > H && pwL >= 0.5 * pwP && BOOK.pages > 1) ? 'landscape' : 'portrait';
    var pw = Math.floor(m === 'landscape' ? pwL : pwP);
    return { mode: m, bookW: m === 'landscape' ? pw * 2 : pw };
  }

  function build(startPage) {
    var L = layout();
    if (pf) { try { pf.destroy(); } catch (e) {} pf = null; }
    var sizer = $('bookSizer');
    if (!sizer) { sizer = document.createElement('div'); sizer.id = 'bookSizer'; $('bookWrap').innerHTML = ''; $('bookWrap').appendChild(sizer); }
    sizer.style.width = L.bookW + 'px';
    sizer.innerHTML = '<div class="stack l"></div><div class="stack r"></div><div id="book"></div><div class="staples" hidden><i></i><i></i></div>';
    var book = $('book');
    var els = [];
    for (var i = 0; i < BOOK.pages; i++) {
      var d = document.createElement('div');
      d.className = 'page';
      d.setAttribute('data-density', 'soft');   // 封面封底与内页一样柔性卷曲
      var img = document.createElement('img');
      img.alt = t('pageN', { n: i + 1 });
      img.setAttribute('data-i', i);
      img.onload = measureTone;
      d.appendChild(img);
      var shade = document.createElement('div');   // 书脊阴影层（PageFlip 会重写 .page 的 style，所以变量放在子元素上）
      shade.className = (i === 0 || i === BOOK.pages - 1) ? 'shade edge' : 'shade';
      d.appendChild(shade);
      if (tones[i]) applyTone(shade, tones[i]);
      book.appendChild(d);
      els.push(d);
    }
    mode = L.mode;
    portraitMinW = Math.ceil(L.bookW / 2) + 1;
    pf = new St.PageFlip(book, {
      width: BOOK.width, height: BOOK.height, size: 'stretch',
      minWidth: mode === 'landscape' ? 1 : portraitMinW, maxWidth: 5000,
      minHeight: 1, maxHeight: 5000,
      usePortrait: mode === 'portrait',
      showCover: true, maxShadowOpacity: 0.85, flippingTime: 700,
      mobileScrollSupport: false, startPage: Math.max(0, Math.min(startPage, BOOK.pages - 1)),
      swipeDistance: 20
    });
    pf.loadFromHTML(els);
    pf.on('flip', function (e) { onPage(e.data, true); });
    pf.on('changeState', function (e) {
      var st = document.querySelector('#bookSizer .staples');
      if (e.data === 'flipping' || e.data === 'user_fold') { preload(cur, 3); if (st) st.classList.add('moving'); }
      else if (e.data === 'read' && st) st.classList.remove('moving');
    });
    onPage(pf.getCurrentPageIndex(), false);
    centerOnScreen();
  }

  /* 让画册位于整个屏幕的正中：画册上下有空余时（如手机竖屏）向屏幕中心移动，不缩小画册 */
  function centerOnScreen() {
    requestAnimationFrame(function () {
      var wrap = $('bookWrap'), sizer = $('bookSizer');
      if (!wrap || !sizer) return;
      wrap.style.transform = '';
      var r = wrap.getBoundingClientRect(), bh = sizer.offsetHeight;
      if (!bh) return;
      var free = Math.max(0, (r.height - bh) / 2);                  // 画册上下各自的空余
      var want = window.innerHeight / 2 - (r.top + r.height / 2);   // 需要移动多少才到屏幕中心
      var dy = Math.round(Math.max(-free, Math.min(free, want)));
      if (dy) wrap.style.transform = 'translateY(' + dy + 'px)';
    });
  }

  var resizeT;
  window.addEventListener('resize', function () {
    if (!pf) return;
    var L = layout();
    var sizer = $('bookSizer');
    if (L.mode !== mode || (mode === 'portrait' && L.bookW >= 2 * portraitMinW - 2)) {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { build(cur); }, 150);
    } else {
      sizer.style.width = L.bookW + 'px';   // 先于 PageFlip 自身的 resize 监听执行
      centerOnScreen();
    }
  });

  /* ---------- 书脊阴影：根据页面靠近书脊一侧的明暗自动调整 ---------- */
  var tones = [];   // 每页 {l: 左边缘亮度, r: 右边缘亮度}，0 暗 ~ 1 亮
  var toneCanvas = null;
  function measureTone() {
    var img = this, i = +img.getAttribute('data-i');
    if (tones[i]) return;
    try {
      toneCanvas = toneCanvas || document.createElement('canvas');
      var W = 40, H = 40; toneCanvas.width = W; toneCanvas.height = H;
      var g = toneCanvas.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, W, H);
      var lum = function (x0) {   // 取边缘 15% 宽的竖条平均亮度
        var d = g.getImageData(x0, 0, 6, H).data, s = 0;
        for (var k = 0; k < d.length; k += 4) s += 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
        return s / (d.length / 4) / 255;
      };
      tones[i] = { l: lum(0), r: lum(W - 6) };
      applyTone(img.parentNode.querySelector('.shade'), tones[i]);
    } catch (e) {}
  }
  function applyTone(el, t) {
    // 亮页：柔和的灰色阴影；暗页：更深的阴影 + 可见的纸面反光，才能看出是两张纸
    ['l', 'r'].forEach(function (side) {
      var v = t[side];
      el.style.setProperty('--sa-' + side, (0.30 + (1 - v) * 0.35).toFixed(3));   // 阴影强度
      el.style.setProperty('--ha-' + side, (0.08 + (1 - v) * 0.14).toFixed(3));   // 反光强度
    });
  }

  /* 两侧书页厚度：随左右剩余页数变化 */
  function updateStacks(sp) {
    var l = document.querySelector('#bookSizer .stack.l'), r = document.querySelector('#bookSizer .stack.r');
    if (!l || !r) return;
    var left = mode === 'landscape' ? sp[0] : 0;
    var right = BOOK.pages - 1 - sp[sp.length - 1];
    // 合上的书（单独显示封面/封底）看不到书页边缘
    var closed = sp.length === 1 && (sp[0] === 0 || sp[0] === BOOK.pages - 1);
    if (closed) { left = 0; right = 0; }
    // 胶装书较厚；骑马订是对折小册子，书页边缘很薄
    var w = SADDLE ? function (n) { return n <= 0 ? 0 : Math.min(4, 1 + n / 24); } : function (n) { return n <= 0 ? 0 : Math.min(10, 1.5 + n / 8); };
    l.style.width = w(left) + 'px'; r.style.width = w(right) + 'px';
    l.classList.toggle('off', !w(left)); r.classList.toggle('off', !w(right));
    $('bookSizer').classList.toggle('closed', closed);
  }

  /* 骑马订：订书钉只在最中间的跨页（订书钉穿过的那张纸）可见 */
  function centerSpreadLeft() {
    var L = Math.floor(BOOK.pages / 2) - 1;   // 中间跨页左页（0 基）；页数为 4 的倍数时恰好是奇数
    if (L % 2 === 0) L -= 1;
    return Math.max(1, L);
  }
  function updateStaples(sp) {
    var el = document.querySelector('#bookSizer .staples');
    if (!el) return;
    var L = centerSpreadLeft(), show = SADDLE && BOOK.pages >= 4 && (sp.indexOf(L) >= 0 || sp.indexOf(L + 1) >= 0);
    el.hidden = !show;
    if (!show) return;
    // 双页：钉在中缝；单页（手机竖屏）：左页钉在右边缘，右页钉在左边缘
    el.className = 'staples ' + (sp.length > 1 ? 'mid' : (sp[0] === L ? 'at-right' : 'at-left'));
  }

  /* ---------- 翻页状态 ---------- */
  function spread(i) {
    if (mode !== 'landscape' || i === 0) return [i];
    var s = i % 2 === 1 ? i : i - 1;
    return s + 1 < BOOK.pages ? [s, s + 1] : [s];
  }

  function onPage(i, flipped) {
    cur = i;
    preload(i, 4);
    var sp = spread(i);
    $('pageNum').textContent = (sp.length > 1 ? (sp[0] + 1) + '-' + (sp[1] + 1) : (sp[0] + 1)) + '/' + BOOK.pages;
    $('slider').value = sp[0] + 1;
    var atStart = i === 0, atEnd = sp[sp.length - 1] >= BOOK.pages - 1;
    // 横屏双页模式下，单独显示封面/封底时居中
    var shift = 0;
    if (mode === 'landscape' && sp.length === 1) shift = sp[0] === 0 ? -25 : 25;
    $('bookSizer').style.transform = shift ? 'translateX(' + shift + '%)' : '';
    updateStacks(sp);
    updateStaples(sp);
    $('btnPrev').classList.toggle('is-disabled', atStart);
    $('btnFirst').classList.toggle('is-disabled', atStart);
    $('btnNext').classList.toggle('is-disabled', atEnd);
    $('btnLast').classList.toggle('is-disabled', atEnd);
    var h = '#p=' + (sp[0] + 1);
    if (location.hash !== h) history.replaceState(null, '', h);
    document.querySelectorAll('.thumb.cur').forEach(function (t) { t.classList.remove('cur'); });
    sp.forEach(function (p) { var t = document.querySelector('.thumb[data-i="' + p + '"]'); if (t) t.classList.add('cur'); });
    if (flipped) playFlip();
    if (atEnd && autoTimer) stopAuto();
  }

  function preload(i, n) {
    var imgs = document.querySelectorAll('#book img[data-i]');
    for (var k = Math.max(0, i - n); k <= Math.min(BOOK.pages - 1, i + n + 1); k++) {
      var img = imgs[k];
      if (img && !img.getAttribute('src')) img.src = pageSrc(k);
    }
  }

  function readHash() {
    var m = /p=(\d+)/.exec(location.hash);
    return m ? Math.max(0, Math.min(BOOK.pages - 1, parseInt(m[1], 10) - 1)) : 0;
  }
  window.addEventListener('hashchange', function () { if (pf) goTo(readHash()); });

  function goTo(i) {
    i = Math.max(0, Math.min(BOOK.pages - 1, i));
    if (!pf) return;
    var sp = spread(cur);
    if (sp.indexOf(i) >= 0) return;
    preload(i, 2);
    if (Math.abs(i - cur) <= 2) pf.flip(i); else { pf.turnToPage(i); onPage(pf.getCurrentPageIndex(), true); }
  }
  function next() { if (pf) pf.flipNext(); }
  function prev() { if (pf) pf.flipPrev(); }

  /* ---------- 工具栏 ---------- */
  $('btnPrev').onclick = prev;
  $('btnNext').onclick = next;
  $('btnFirst').onclick = function () { goTo(0); };
  $('btnLast').onclick = function () { goTo(BOOK.pages - 1); };
  $('btnHome').onclick = function () { goTo(0); };
  $('btnZoom').onclick = function () { openZoom(); };

  var slider = $('slider'), tip = $('sliderTip');
  function showTip() {
    var v = +slider.value, pct = (v - 1) / Math.max(1, BOOK.pages - 1);
    tip.innerHTML = '<img src="' + thumbSrc(v - 1) + '" alt="">' + v;
    tip.style.left = (pct * slider.clientWidth) + 'px';
    tip.style.display = 'block';
  }
  slider.addEventListener('input', showTip);
  slider.addEventListener('change', function () { tip.style.display = 'none'; goTo(+slider.value - 1); });
  slider.addEventListener('pointerup', function () { tip.style.display = 'none'; });

  function togglePanel(id) {
    ['thumbPanel', 'searchPanel'].forEach(function (p) { if (p !== id) $(p).hidden = true; });
    $(id).hidden = !$(id).hidden;
    $('moreMenu').hidden = true;
    if (id === 'thumbPanel' && !$(id).hidden) { var c = document.querySelector('.thumb.cur'); if (c) c.scrollIntoView({ block: 'center' }); }
    if (id === 'searchPanel' && !$(id).hidden) setTimeout(function () { $('searchInput').focus(); }, 50);
  }
  $('btnThumbs').onclick = function () { togglePanel('thumbPanel'); };
  $('btnLang').onclick = function () { setLang(LANG === 'zh' ? 'en' : 'zh'); };
  $('btnSearch').onclick = function () { togglePanel('searchPanel'); };
  $('btnMore').onclick = function (e) { e.stopPropagation(); $('moreMenu').hidden = !$('moreMenu').hidden; };
  document.addEventListener('click', function (e) { if (!$('moreMenu').contains(e.target)) $('moreMenu').hidden = true; });
  document.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { $(b.getAttribute('data-close')).hidden = true; }; });
  document.querySelectorAll('.dlg').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) d.hidden = true; }); });

  $('moreMenu').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $('moreMenu').hidden = true;
    var act = b.getAttribute('data-act');
    if (act === 'fullscreen') toggleFullscreen();
    if (act === 'autoplay') autoTimer ? stopAuto() : startAuto();
    if (act === 'sound') { soundOn = !soundOn; store('eb-sound', soundOn ? '1' : '0'); updateSoundLabel(); toast(t(soundOn ? 'soundOnToast' : 'soundOffToast')); }
    if (act === 'share') openShare();
    if (act === 'install') openInstall();
    if (act === 'download') { var a = document.createElement('a'); a.href = BOOK.pdf; a.download = BOOK.title + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); }
  });

  function toggleFullscreen() {
    var d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (el.requestFullscreen || el.webkitRequestFullscreen) (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    else toast(t('noFullscreen'));
  }
  function startAuto() {
    if (spread(cur).slice(-1)[0] >= BOOK.pages - 1) goTo(0);
    autoTimer = setInterval(next, (BOOK.autoplaySeconds || 4) * 1000);
    updateAutoLabel(); toast(t('autoStarted'));
  }
  function stopAuto() { clearInterval(autoTimer); autoTimer = null; updateAutoLabel(); }
  function updateAutoLabel() { $('autoplayLabel').textContent = t(autoTimer ? 'autoStop' : 'autoplay'); }
  function updateSoundLabel() { $('soundLabel').textContent = t(soundOn ? 'soundOn' : 'soundOff'); }

  /* 翻页声音：用 WebAudio 合成，无需音频文件 */
  var actx = null;
  function playFlip() {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var dur = 0.35, n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) { var t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.6)), 2) * (1 - t); }
      var src = actx.createBufferSource(); src.buffer = buf;
      var f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.6;
      var g = actx.createGain(); g.gain.value = 0.35;
      src.connect(f); f.connect(g); g.connect(actx.destination); src.start();
    } catch (e) {}
  }

  /* 键盘 */
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') e.target.blur(); return; }
    if (!$('zoomLayer').hidden) { if (e.key === 'Escape') closeZoom(); return; }
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ': next(); e.preventDefault(); break;
      case 'ArrowLeft': case 'PageUp': prev(); e.preventDefault(); break;
      case 'Home': goTo(0); break;
      case 'End': goTo(BOOK.pages - 1); break;
      case 'Escape': ['thumbPanel', 'searchPanel', 'shareDlg', 'installDlg', 'moreMenu'].forEach(function (p) { $(p).hidden = true; }); break;
    }
  });
  /* 桌面滚轮翻页，Ctrl+滚轮放大 */
  var wheelLock = 0;
  $('stage').addEventListener('wheel', function (e) {
    e.preventDefault();
    if (e.ctrlKey) { if (e.deltaY < 0) openZoom(); return; }
    var now = Date.now(); if (now - wheelLock < 600 || Math.abs(e.deltaY) < 20) return; wheelLock = now;
    e.deltaY > 0 ? next() : prev();
  }, { passive: false });
  $('stage').addEventListener('dblclick', function (e) { if (e.target.closest('#bookWrap')) openZoom(); });

  /* ---------- 缩略图 ---------- */
  function buildThumbs() {
    var g = $('thumbGrid'), html = '';
    for (var i = 0; i < BOOK.pages; i++) html += '<button class="thumb" data-i="' + i + '"><img loading="lazy" src="' + thumbSrc(i) + '" alt=""><span>' + (i + 1) + '</span></button>';
    g.innerHTML = html;
    g.onclick = function (e) {
      var t = e.target.closest('.thumb'); if (!t) return;
      goTo(+t.getAttribute('data-i'));
      if (window.innerWidth < 700) $('thumbPanel').hidden = true;
    };
    onPage(cur, false);
  }

  /* ---------- 搜索 ---------- */
  $('searchForm').onsubmit = function (e) {
    e.preventDefault();
    var q = $('searchInput').value.trim(), out = $('searchResults');
    if (!q) { out.innerHTML = ''; return; }
    if (/^\d+$/.test(q)) { goTo(+q - 1); out.innerHTML = '<div class="empty">' + t('jumped', { n: Math.min(+q, BOOK.pages) }) + '</div>'; return; }
    if (!BOOK.text) { out.innerHTML = '<div class="empty">' + t('noText') + '</div>'; return; }
    var ql = q.toLowerCase(), html = '', count = 0;
    BOOK.text.forEach(function (txt, i) {
      if (!txt) return;
      var idx = txt.toLowerCase().indexOf(ql); if (idx < 0) return;
      count++;
      var s = Math.max(0, idx - 30), snip = txt.slice(s, idx + q.length + 60);
      var hi = esc(snip).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[&<>"]/g, function (c) { return esc(c); }), 'gi'), function (m) { return '<mark>' + m + '</mark>'; });
      html += '<button class="sr" data-i="' + i + '"><img src="' + thumbSrc(i) + '" alt=""><div><b>' + t('pageN', { n: i + 1 }) + '</b><span>' + (s > 0 ? '…' : '') + hi + '…</span></div></button>';
    });
    out.innerHTML = count ? '<div class="empty" style="padding:8px">' + t('found', { n: count }) + '</div>' + html : '<div class="empty">' + t('notFound', { q: esc(q) }) + '</div>';
  };
  $('searchResults').onclick = function (e) {
    var b = e.target.closest('.sr'); if (!b) return;
    goTo(+b.getAttribute('data-i'));
    if (window.innerWidth < 700) $('searchPanel').hidden = true;
  };

  /* ---------- 放大 ---------- */
  var zoom = 2;
  function openZoom() {
    var sp = spread(cur), inner = $('zoomInner');
    inner.innerHTML = sp.map(function (i) { return '<img src="' + pageSrc(i) + '" alt="">'; }).join('');
    $('zoomLayer').hidden = false;
    zoom = 2; applyZoom(0.5, 0.5);
  }
  function closeZoom() { $('zoomLayer').hidden = true; }
  function applyZoom(fx, fy) {
    var sc = $('zoomScroll'), sp = spread(cur).length;
    var baseH = sc.clientHeight - 40, r = BOOK.width / BOOK.height;
    var baseW = Math.min(baseH * r, (sc.clientWidth - 40) / sp);
    var w = Math.round(baseW * zoom);
    var oldW = sc.scrollWidth, oldH = sc.scrollHeight;
    var cx = sc.scrollLeft + sc.clientWidth * fx, cy = sc.scrollTop + sc.clientHeight * fy;
    $('zoomInner').querySelectorAll('img').forEach(function (img) { img.style.width = w + 'px'; img.style.height = Math.round(w / r) + 'px'; });
    $('zoomVal').textContent = Math.round(zoom * 100) + '%';
    var nw = sc.scrollWidth, nh = sc.scrollHeight;
    sc.scrollLeft = cx * nw / oldW - sc.clientWidth * fx;
    sc.scrollTop = cy * nh / oldH - sc.clientHeight * fy;
  }
  function setZoom(z, fx, fy) { zoom = Math.max(1, Math.min(5, z)); applyZoom(fx == null ? 0.5 : fx, fy == null ? 0.5 : fy); }
  $('zoomIn2').onclick = function () { setZoom(zoom + 0.5); };
  $('zoomOut').onclick = function () { if (zoom <= 1) closeZoom(); else setZoom(zoom - 0.5); };
  $('zoomClose').onclick = closeZoom;
  (function () {
    var sc = $('zoomScroll'), drag = null, pinch = null;
    sc.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = sc.getBoundingClientRect();
      if (e.ctrlKey || Math.abs(e.deltaY) > 0) setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    }, { passive: false });
    sc.addEventListener('mousedown', function (e) { drag = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop, moved: false }; sc.classList.add('drag'); e.preventDefault(); });
    window.addEventListener('mousemove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; sc.scrollLeft = drag.l - dx; sc.scrollTop = drag.t - dy; });
    window.addEventListener('mouseup', function () { if (drag && !drag.moved && !$('zoomLayer').hidden) { /* 单击不关闭，避免误触 */ } drag = null; sc.classList.remove('drag'); });
    sc.addEventListener('dblclick', closeZoom);
    function dist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
    sc.addEventListener('touchstart', function (e) { if (e.touches.length === 2) { pinch = { d: dist(e.touches), z: zoom }; } }, { passive: true });
    sc.addEventListener('touchmove', function (e) {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        var r = sc.getBoundingClientRect(), mx = (e.touches[0].clientX + e.touches[1].clientX) / 2, my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setZoom(pinch.z * dist(e.touches) / pinch.d, (mx - r.left) / r.width, (my - r.top) / r.height);
      }
    }, { passive: false });
    sc.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  })();
  /* 手机端双指在书上捏合 -> 进入放大 */
  $('stage').addEventListener('touchstart', function (e) { if (e.touches.length === 2) openZoom(); }, { passive: true });

  /* ---------- 分享 / 二维码 ---------- */
  function shareUrl() {
    var u = location.href.split('#')[0];
    if ($('sharePage').checked) u += '#p=' + (spread(cur)[0] + 1);
    return u;
  }
  function makeQR(text) {
    var qr = qrcode(0, 'M'); qr.addData(unescape(encodeURIComponent(text)), 'Byte'); qr.make();
    return qr;
  }
  function renderShare() {
    var url = shareUrl(), qr = makeQR(url), n = qr.getModuleCount(), cell = 8, m = 4;
    var c = document.createElement('canvas'); c.width = c.height = (n + m * 2) * cell;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect((k + m) * cell, (r + m) * cell, cell, cell);
    $('qrBox').innerHTML = ''; $('qrBox').appendChild(c);
    $('shareUrl').value = url;
    return c;
  }
  function openShare() {
    $('shareDlg').hidden = false; renderShare();
    $('nativeShare').hidden = !navigator.share;
    if (location.protocol === 'file:' || /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname)) toast(t('localTip'));
  }
  $('sharePage').onchange = renderShare;
  $('copyUrl').onclick = function () {
    var v = $('shareUrl').value;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast(t('copied')); }, function () { $('shareUrl').select(); document.execCommand('copy'); toast(t('copied')); });
  };
  $('saveQr').onclick = function () {
    var qc = renderShare(), pad = 40, W = qc.width + pad * 2, H = qc.height + pad * 2 + 60;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.drawImage(qc, pad, pad);
    g.fillStyle = '#222'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center';
    var t = BOOK.title; while (g.measureText(t).width > W - 40 && t.length > 2) t = t.slice(0, -2) + '…';
    g.fillText(t, W / 2, qc.height + pad + 36);
    g.fillStyle = '#888'; g.font = '18px sans-serif'; g.fillText(t('scanToRead'), W / 2, qc.height + pad + 64);
    var a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = BOOK.title + t('qrFile'); document.body.appendChild(a); a.click(); a.remove();
  };
  $('nativeShare').onclick = function () { navigator.share({ title: BOOK.title, url: shareUrl() }).catch(function () {}); };

  /* ---------- 安装到手机（PWA） ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredInstall = e;
    if (BOOK) maybeShowBar();
  });
  window.addEventListener('appinstalled', function () { $('installBar').hidden = true; deferredInstall = null; toast(t('installed')); });

  function setupInstall() {
    if (isStandalone) { $('installItem').hidden = true; return; }
    maybeShowBar();
  }
  function maybeShowBar() {
    if (isStandalone || store('eb-install-dismiss') === '1') return;
    var mobile = /android|iphone|ipad|ipod|mobile/i.test(ua) || isIOS;
    if (!mobile) return;
    if (deferredInstall || isIOS || isWeChat || isQQ) $('installBar').hidden = false;
  }
  $('installLater').onclick = function () { $('installBar').hidden = true; store('eb-install-dismiss', '1'); };
  $('installNow').onclick = function () { $('installBar').hidden = true; openInstall(); };

  function openInstall() {
    var body = $('installBody');
    if (isStandalone) { toast(t('alreadyApp')); return; }
    if (deferredInstall) {
      deferredInstall.prompt();
      deferredInstall.userChoice.then(function (c) { if (c.outcome === 'accepted') toast(t('installing')); deferredInstall = null; });
      return;
    }
    if (isWeChat || isQQ) {
      body.innerHTML = t('instWechat');
    } else if (isIOS) {
      body.innerHTML = t('instIOS');
    } else if (location.protocol !== 'https:' && !/^(localhost|127\.)/.test(location.hostname)) {
      body.innerHTML = t('instHttps');
    } else {
      body.innerHTML = t('instChrome');
    }
    $('installDlg').hidden = false;
  }
})();
