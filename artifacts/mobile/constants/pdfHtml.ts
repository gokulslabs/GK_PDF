export const getPdfViewerHtml = (darkMode: boolean): string => {
  const bg = darkMode ? "#1C1C1E" : "#E8E8E8";
  const textColor = darkMode ? "#fff" : "#111";
  const spinnerBorder = darkMode
    ? "rgba(255,255,255,0.15)"
    : "rgba(0,0,0,0.12)";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html { background: ${bg}; }
    body { background: ${bg}; font-family: -apple-system, system-ui, sans-serif; min-height: 100vh; }

    #loading {
      position: fixed; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: ${bg}; color: ${textColor}; gap: 14px; z-index: 999;
    }
    .spinner {
      width: 38px; height: 38px;
      border: 3px solid ${spinnerBorder};
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    #scroll-wrap {
      width: 100%; min-height: 100vh;
      overflow-y: auto; overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      display: none;
    }
    #pages { padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 10px; }

    .page-wrap {
      position: relative;
      background: #fff;
      border-radius: 3px;
      box-shadow: 0 2px 16px rgba(0,0,0,${darkMode ? "0.55" : "0.18"});
      overflow: hidden;
      flex-shrink: 0;
      transition: box-shadow 0.2s;
    }
    .page-wrap.search-match {
      box-shadow: 0 0 0 2.5px #FBBF24, 0 2px 16px rgba(0,0,0,${darkMode ? "0.55" : "0.18"});
    }
    .pdf-cv { display: block; }
    .srch-cv {
      position: absolute; top: 0; left: 0;
      pointer-events: none; z-index: 1;
    }
    .ann-cv {
      position: absolute; top: 0; left: 0;
      touch-action: none; z-index: 2;
    }

    #err {
      display: none; position: fixed; inset: 0;
      background: ${bg}; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 10px; color: #EF4444; text-align: center; padding: 28px; font-size: 14px;
    }
    .err-icon { font-size: 36px; margin-bottom: 4px; }
  </style>
</head>
<body>

<div id="loading">
  <div class="spinner"></div>
  <span style="font-size:13px;opacity:0.65">Loading PDF…</span>
</div>
<div id="err">
  <div class="err-icon">⚠</div>
  <div id="err-msg">Failed to load PDF</div>
</div>
<div id="scroll-wrap">
  <div id="pages"></div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" crossorigin="anonymous"></script>
<script>
var DARK = ${darkMode ? "true" : "false"};
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── State ──────────────────────────────────────────────────────────────────
var pdfDoc = null, numPages = 0;
var tool = 'none', drawColor = '#FFEB3B';
var drawings = {};
var drawing = false, activeCvs = null;

// Text index: page → [{str, x, y, w, h}] in CSS px
var textIndex = {};
// Search
var searchResults = [];
var currentSearchIdx = -1;
var currentQuery = '';

// ── RN Bridge ─────────────────────────────────────────────────────────────
function rn(data) {
  try { window.ReactNativeWebView.postMessage(JSON.stringify(data)); } catch(e) {}
}

function recv(raw) {
  var msg;
  try { msg = JSON.parse(raw); } catch(e) { return; }
  switch(msg.type) {
    case 'LOAD':         loadPDF(msg.data);              break;
    case 'TOOL':         tool = msg.value;               break;
    case 'COLOR':        drawColor = msg.value;          break;
    case 'GOTO':         goto(msg.page);                 break;
    case 'DARK':         applyDark(msg.value);           break;
    case 'CLEAR':        clearAnnot(msg.page);           break;
    case 'RESTORE':      restoreAnnot(msg.page, msg.data); break;
    case 'SEARCH':       doSearch(msg.query);            break;
    case 'SEARCH_GOTO':  gotoResult(msg.index);          break;
    case 'SEARCH_CLEAR': clearSearch();                  break;
  }
}

window.addEventListener('message', function(e) { recv(e.data); });
document.addEventListener('message', function(e) { recv(e.data); });

// ── Error ──────────────────────────────────────────────────────────────────
function showErr(msg) {
  document.getElementById('loading').style.display = 'none';
  var el = document.getElementById('err');
  el.style.display = 'flex';
  document.getElementById('err-msg').textContent = msg;
  rn({ type: 'ERROR', message: msg });
}

// ── Load PDF ───────────────────────────────────────────────────────────────
async function loadPDF(b64) {
  try {
    var bin = atob(b64);
    var buf = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    var task = pdfjsLib.getDocument({ data: buf });
    pdfDoc = await task.promise;
    numPages = pdfDoc.numPages;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('scroll-wrap').style.display = 'block';
    rn({ type: 'LOADED', pages: numPages });
    await renderAll();
    setupScroll();
    // Generate thumbnails after main render (non-blocking)
    renderThumbs();
  } catch(e) {
    showErr(String(e && e.message ? e.message : e));
  }
}

// ── Render full pages ──────────────────────────────────────────────────────
async function renderAll() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var maxW = window.innerWidth - 16;
  for (var i = 1; i <= numPages; i++) {
    await renderPage(i, dpr, maxW);
  }
}

async function renderPage(n, dpr, maxW) {
  var page = await pdfDoc.getPage(n);
  var vp0 = page.getViewport({ scale: 1 });
  var sc = (maxW / vp0.width) * dpr;
  var vp = page.getViewport({ scale: sc });
  var cssW = Math.round(vp.width / dpr);
  var cssH = Math.round(vp.height / dpr);

  // Wrapper
  var wrap = document.createElement('div');
  wrap.className = 'page-wrap';
  wrap.id = 'pg' + n;
  wrap.dataset.page = n;
  wrap.style.width = cssW + 'px';
  wrap.style.height = cssH + 'px';

  // PDF canvas
  var cv = document.createElement('canvas');
  cv.className = 'pdf-cv';
  cv.width = vp.width; cv.height = vp.height;
  cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  wrap.appendChild(cv);

  // Search highlight canvas
  var scv = document.createElement('canvas');
  scv.className = 'srch-cv';
  scv.width = cssW; scv.height = cssH;
  scv.style.width = cssW + 'px'; scv.style.height = cssH + 'px';
  wrap.appendChild(scv);

  // Annotation canvas
  var av = document.createElement('canvas');
  av.className = 'ann-cv';
  av.width = cssW; av.height = cssH;
  av.style.width = cssW + 'px'; av.style.height = cssH + 'px';
  wrap.appendChild(av);

  document.getElementById('pages').appendChild(wrap);

  // Render PDF
  var ctx = cv.getContext('2d');
  if (DARK) { ctx.filter = 'invert(1) hue-rotate(180deg)'; }
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  // Build text index
  await buildTextIndex(n, page, vp, dpr);

  // Restore annotation
  if (drawings[n]) {
    var img = new Image();
    img.onload = function() { av.getContext('2d').drawImage(img, 0, 0); };
    img.src = drawings[n];
  }

  setupDraw(av, n);
}

// ── Thumbnails ─────────────────────────────────────────────────────────────
var THUMB_W = 68;

async function renderThumbs() {
  for (var n = 1; n <= numPages; n++) {
    await renderThumb(n);
  }
}

async function renderThumb(n) {
  try {
    var page = await pdfDoc.getPage(n);
    var vp0 = page.getViewport({ scale: 1 });
    var scale = THUMB_W / vp0.width;
    var vp = page.getViewport({ scale: scale });
    var cv = document.createElement('canvas');
    cv.width = Math.round(vp.width);
    cv.height = Math.round(vp.height);
    var ctx = cv.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    rn({
      type: 'THUMB',
      page: n,
      data: cv.toDataURL('image/jpeg', 0.6),
      w: cv.width,
      h: cv.height
    });
  } catch(e) {}
}

// ── Text Index ─────────────────────────────────────────────────────────────
async function buildTextIndex(n, page, vp, dpr) {
  try {
    var tc = await page.getTextContent({ normalizeWhitespace: true });
    var items = [];
    tc.items.forEach(function(item) {
      if (!item.str) return;
      var tx = pdfjsLib.Util.transform(vp.transform, item.transform);
      var fsPx = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
      if (fsPx === 0) fsPx = Math.abs(tx[0]);
      var wPx = item.width > 0
        ? item.width * Math.abs(tx[0] / (item.transform[0] || 1))
        : fsPx * item.str.length * 0.5;
      items.push({
        str: item.str,
        x: tx[4] / dpr,
        y: (tx[5] - fsPx) / dpr,
        w: Math.max(wPx / dpr, 4),
        h: Math.max((fsPx * 1.25) / dpr, 6)
      });
    });
    textIndex[n] = items;
  } catch(e) {
    textIndex[n] = [];
  }
}

// ── Search ─────────────────────────────────────────────────────────────────
async function doSearch(query) {
  clearSearch();
  if (!pdfDoc || !query || !query.trim()) {
    rn({ type: 'SEARCH_DONE', results: [], total: 0 });
    return;
  }
  currentQuery = query;
  var lq = query.toLowerCase();
  var results = [];

  for (var n = 1; n <= numPages; n++) {
    var items = textIndex[n] || [];
    var matched = items.filter(function(it) {
      return it.str.toLowerCase().indexOf(lq) !== -1;
    });
    if (matched.length === 0) {
      var full = items.map(function(i) { return i.str; }).join('');
      if (full.toLowerCase().indexOf(lq) !== -1) matched = items;
    }
    if (matched.length > 0) {
      results.push({ page: n, count: matched.length, rects: matched.map(function(it) {
        return { x: it.x, y: it.y, w: it.w, h: it.h };
      })});
      drawSearchHighlights(n, results[results.length - 1].rects);
    }
  }

  searchResults = results;
  rn({
    type: 'SEARCH_DONE',
    results: results.map(function(r) { return { page: r.page, count: r.count }; }),
    total: results.length
  });
  if (results.length > 0) { currentSearchIdx = 0; goto(results[0].page); }
}

function drawSearchHighlights(n, rects) {
  var wrap = document.getElementById('pg' + n);
  if (!wrap) return;
  wrap.classList.add('search-match');
  var scv = wrap.querySelector('.srch-cv');
  if (!scv) return;
  var ctx = scv.getContext('2d');
  ctx.clearRect(0, 0, scv.width, scv.height);
  ctx.fillStyle = 'rgba(251, 191, 36, 0.38)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
  ctx.lineWidth = 1;
  rects.forEach(function(r) {
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });
}

function clearSearch() {
  currentQuery = ''; searchResults = []; currentSearchIdx = -1;
  for (var n = 1; n <= numPages; n++) {
    var wrap = document.getElementById('pg' + n);
    if (!wrap) continue;
    wrap.classList.remove('search-match');
    var scv = wrap.querySelector('.srch-cv');
    if (scv) scv.getContext('2d').clearRect(0, 0, scv.width, scv.height);
  }
}

function gotoResult(idx) {
  if (idx < 0 || idx >= searchResults.length) return;
  currentSearchIdx = idx;
  goto(searchResults[idx].page);
}

// ── Annotation Drawing ─────────────────────────────────────────────────────
function setupDraw(cv, n) {
  var ctx = cv.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  function pt(t) {
    var r = cv.getBoundingClientRect();
    return {
      x: (t.clientX - r.left) * (cv.width / r.width),
      y: (t.clientY - r.top) * (cv.height / r.height)
    };
  }

  cv.addEventListener('touchstart', function(e) {
    if (tool === 'none') return;
    e.preventDefault(); e.stopPropagation();
    drawing = true; activeCvs = cv;
    var p = pt(e.touches[0]);
    applyStyle(ctx);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  }, { passive: false });

  cv.addEventListener('touchmove', function(e) {
    if (!drawing || activeCvs !== cv) return;
    e.preventDefault();
    var p = pt(e.touches[0]);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  }, { passive: false });

  function end() {
    if (!drawing || activeCvs !== cv) return;
    drawing = false; activeCvs = null;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawings[n] = cv.toDataURL('image/png');
    rn({ type: 'ANNOT', page: n, data: drawings[n] });
  }
  cv.addEventListener('touchend', end, { passive: true });
  cv.addEventListener('touchcancel', end, { passive: true });
}

function applyStyle(ctx) {
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 28; ctx.globalAlpha = 1;
  } else if (tool === 'highlight') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = drawColor; ctx.lineWidth = 22; ctx.globalAlpha = 0.36;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = drawColor; ctx.lineWidth = 3; ctx.globalAlpha = 1;
  }
}

// ── Navigation & Utils ────────────────────────────────────────────────────
function goto(n) {
  var el = document.getElementById('pg' + n);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearAnnot(n) {
  delete drawings[n];
  var wrap = document.getElementById('pg' + n);
  if (wrap) {
    var av = wrap.querySelector('.ann-cv');
    if (av) av.getContext('2d').clearRect(0, 0, av.width, av.height);
  }
}

function restoreAnnot(n, dataUrl) {
  drawings[n] = dataUrl;
  var wrap = document.getElementById('pg' + n);
  if (wrap) {
    var av = wrap.querySelector('.ann-cv');
    if (av) {
      var img = new Image();
      img.onload = function() { av.getContext('2d').drawImage(img, 0, 0); };
      img.src = dataUrl;
    }
  }
}

function applyDark(v) {
  DARK = v;
  document.body.style.background = v ? '#1C1C1E' : '#E8E8E8';
  document.getElementById('scroll-wrap').style.background = v ? '#1C1C1E' : '#E8E8E8';
}

// ── Scroll Tracking ───────────────────────────────────────────────────────
function setupScroll() {
  var sc = document.getElementById('scroll-wrap');
  var lastPage = 1; var rafId = null;
  sc.addEventListener('scroll', function() {
    if (rafId) return;
    rafId = requestAnimationFrame(function() {
      rafId = null;
      var mid = sc.scrollTop + sc.clientHeight / 2;
      var pgs = document.querySelectorAll('.page-wrap');
      var best = 1, minD = 1e9;
      pgs.forEach(function(el) {
        var c = el.offsetTop + el.offsetHeight / 2;
        var d = Math.abs(c - mid);
        if (d < minD) { minD = d; best = parseInt(el.dataset.page); }
      });
      if (best !== lastPage) { lastPage = best; rn({ type: 'PAGE', page: best }); }
    });
  });
}

rn({ type: 'READY' });
</script>
</body>
</html>`;
};
