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
      overflow: visible;
      flex-shrink: 0;
      transition: box-shadow 0.2s;
    }
    .page-clip {
      position: relative;
      overflow: hidden;
      border-radius: 3px;
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
      z-index: 2;
    }

    /* Sticky note pins */
    .note-pin {
      position: absolute;
      z-index: 20;
      width: 26px; height: 26px;
      border-radius: 50%;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      border: 2.5px solid rgba(255,255,255,0.85);
      transform: translate(-13px, -13px);
      transition: transform 0.15s, box-shadow 0.15s;
      user-select: none;
    }
    .note-pin:active {
      transform: translate(-13px, -13px) scale(1.25);
      box-shadow: 0 4px 14px rgba(0,0,0,0.45);
    }

    /* Long-press ripple */
    .press-ripple {
      position: absolute; z-index: 15;
      width: 36px; height: 36px;
      border-radius: 50%;
      background: rgba(99,102,241,0.3);
      transform: translate(-18px, -18px);
      animation: ripple 0.6s ease-out forwards;
      pointer-events: none;
    }
    @keyframes ripple {
      0% { opacity: 1; transform: translate(-18px,-18px) scale(0.5); }
      100% { opacity: 0; transform: translate(-18px,-18px) scale(2.5); }
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

// ── State ─────────────────────────────────────────────────────────────────
var pdfDoc = null, numPages = 0;
var tool = 'none', drawColor = '#FFEB3B';
var drawings = {};
var drawing = false, activeCvs = null;
var textIndex = {};
var searchResults = [], currentSearchIdx = -1;
var notes = {};         // id → {id, page, x, y, color, text}
var pageSize = {};      // page → {cssW, cssH}
var shapeType = 'rect'; // 'line' | 'rect' | 'circle'

// ── RN Bridge ────────────────────────────────────────────────────────────
function rn(data) {
  try { window.ReactNativeWebView.postMessage(JSON.stringify(data)); } catch(e) {}
}

function recv(raw) {
  var msg; try { msg = JSON.parse(raw); } catch(e) { return; }
  switch(msg.type) {
    case 'LOAD':         loadPDF(msg.data);              break;
    case 'TOOL':         setTool(msg.value);             break;
    case 'COLOR':        drawColor = msg.value;          break;
    case 'GOTO':         goto(msg.page);                 break;
    case 'DARK':         applyDark(msg.value);           break;
    case 'CLEAR':        clearAnnot(msg.page);           break;
    case 'RESTORE':      restoreAnnot(msg.page, msg.data); break;
    case 'SEARCH':       doSearch(msg.query);            break;
    case 'SEARCH_GOTO':  gotoResult(msg.index);          break;
    case 'SEARCH_CLEAR': clearSearch();                  break;
    case 'SHAPE_TYPE':   shapeType = msg.value;           break;
    case 'LOAD_NOTES':   loadNotes(msg.notes);           break;
    case 'ADD_NOTE':     addNote(msg.note);              break;
    case 'UPDATE_NOTE':  updateNote(msg.id, msg.color, msg.text); break;
    case 'DELETE_NOTE':  deleteNote(msg.id);             break;
  }
}

window.addEventListener('message', function(e) { recv(e.data); });
document.addEventListener('message', function(e) { recv(e.data); });

// ── Tool management ───────────────────────────────────────────────────────
function setTool(value) {
  tool = value;
  // Toggle ann-cv pointer events based on tool
  document.querySelectorAll('.ann-cv').forEach(function(cv) {
    cv.style.pointerEvents = tool === 'none' ? 'none' : 'auto';
    cv.style.touchAction = tool === 'none' ? 'auto' : 'none';
  });
}

// ── Error ─────────────────────────────────────────────────────────────────
function showErr(msg) {
  document.getElementById('loading').style.display = 'none';
  var el = document.getElementById('err'); el.style.display = 'flex';
  document.getElementById('err-msg').textContent = msg;
  rn({ type: 'ERROR', message: msg });
}

// ── Load PDF ──────────────────────────────────────────────────────────────
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
    renderThumbs();
  } catch(e) { showErr(String(e && e.message ? e.message : e)); }
}

// ── Render all pages ──────────────────────────────────────────────────────
async function renderAll() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var maxW = window.innerWidth - 16;
  for (var i = 1; i <= numPages; i++) await renderPage(i, dpr, maxW);
}

async function renderPage(n, dpr, maxW) {
  var page = await pdfDoc.getPage(n);
  var vp0 = page.getViewport({ scale: 1 });
  var sc = (maxW / vp0.width) * dpr;
  var vp = page.getViewport({ scale: sc });
  var cssW = Math.round(vp.width / dpr);
  var cssH = Math.round(vp.height / dpr);
  pageSize[n] = { cssW: cssW, cssH: cssH };

  // Outer wrapper (overflow: visible so note pins aren't clipped)
  var wrap = document.createElement('div');
  wrap.className = 'page-wrap'; wrap.id = 'pg' + n; wrap.dataset.page = n;
  wrap.style.width = cssW + 'px'; wrap.style.height = cssH + 'px';

  // Inner clip (handles shadow/border without clipping pins)
  var clip = document.createElement('div');
  clip.className = 'page-clip';
  clip.style.width = cssW + 'px'; clip.style.height = cssH + 'px';
  wrap.appendChild(clip);

  // PDF canvas
  var cv = document.createElement('canvas');
  cv.className = 'pdf-cv'; cv.width = vp.width; cv.height = vp.height;
  cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  clip.appendChild(cv);

  // Search canvas
  var scv = document.createElement('canvas');
  scv.className = 'srch-cv'; scv.width = cssW; scv.height = cssH;
  scv.style.width = cssW + 'px'; scv.style.height = cssH + 'px';
  clip.appendChild(scv);

  // Annotation canvas
  var av = document.createElement('canvas');
  av.className = 'ann-cv'; av.width = cssW; av.height = cssH;
  av.style.width = cssW + 'px'; av.style.height = cssH + 'px';
  av.style.pointerEvents = tool === 'none' ? 'none' : 'auto';
  clip.appendChild(av);

  document.getElementById('pages').appendChild(wrap);

  // Render PDF page
  var ctx = cv.getContext('2d');
  if (DARK) { ctx.filter = 'invert(1) hue-rotate(180deg)'; }
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  // Build text index
  await buildTextIndex(n, page, vp, dpr);

  // Restore annotation drawing
  if (drawings[n]) {
    var img = new Image();
    img.onload = function() { av.getContext('2d').drawImage(img, 0, 0); };
    img.src = drawings[n];
  }

  setupDraw(av, n);
  setupLongPress(wrap, n, cssW, cssH);

  // Render any notes already on this page
  Object.values(notes).forEach(function(note) {
    if (note.page === n) renderNotePin(note, wrap, cssW, cssH);
  });
}

// ── Thumbnails ────────────────────────────────────────────────────────────
async function renderThumbs() {
  var thumbW = 68;
  for (var n = 1; n <= numPages; n++) {
    try {
      var page = await pdfDoc.getPage(n);
      var vp0 = page.getViewport({ scale: 1 });
      var vp = page.getViewport({ scale: thumbW / vp0.width });
      var cv = document.createElement('canvas');
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      rn({ type: 'THUMB', page: n, data: cv.toDataURL('image/jpeg', 0.6), w: cv.width, h: cv.height });
    } catch(e) {}
  }
}

// ── Text Index ────────────────────────────────────────────────────────────
async function buildTextIndex(n, page, vp, dpr) {
  try {
    var tc = await page.getTextContent({ normalizeWhitespace: true });
    var items = [];
    tc.items.forEach(function(item) {
      if (!item.str) return;
      var tx = pdfjsLib.Util.transform(vp.transform, item.transform);
      var fsPx = Math.sqrt(tx[2]*tx[2] + tx[3]*tx[3]) || Math.abs(tx[0]);
      var wPx = item.width > 0 ? item.width * Math.abs(tx[0] / (item.transform[0] || 1)) : fsPx * item.str.length * 0.5;
      items.push({ str: item.str, x: tx[4]/dpr, y: (tx[5]-fsPx)/dpr, w: Math.max(wPx/dpr, 4), h: Math.max(fsPx*1.25/dpr, 6) });
    });
    textIndex[n] = items;
  } catch(e) { textIndex[n] = []; }
}

// ── Search ────────────────────────────────────────────────────────────────
async function doSearch(query) {
  clearSearch();
  if (!pdfDoc || !query || !query.trim()) { rn({ type: 'SEARCH_DONE', results: [], total: 0 }); return; }
  var lq = query.toLowerCase(); var results = [];
  for (var n = 1; n <= numPages; n++) {
    var items = textIndex[n] || [];
    var matched = items.filter(function(it) { return it.str.toLowerCase().indexOf(lq) !== -1; });
    if (!matched.length) {
      if (items.map(function(i){return i.str;}).join('').toLowerCase().indexOf(lq) !== -1) matched = items;
    }
    if (matched.length) {
      results.push({ page: n, count: matched.length, rects: matched.map(function(it){ return {x:it.x,y:it.y,w:it.w,h:it.h}; }) });
      drawSearchHighlights(n, results[results.length-1].rects);
    }
  }
  searchResults = results;
  rn({ type: 'SEARCH_DONE', results: results.map(function(r){ return {page:r.page,count:r.count}; }), total: results.length });
  if (results.length) { currentSearchIdx = 0; goto(results[0].page); }
}

function drawSearchHighlights(n, rects) {
  var wrap = document.getElementById('pg'+n); if (!wrap) return;
  wrap.classList.add('search-match');
  var scv = wrap.querySelector('.srch-cv'); if (!scv) return;
  var ctx = scv.getContext('2d'); ctx.clearRect(0,0,scv.width,scv.height);
  ctx.fillStyle = 'rgba(251,191,36,0.38)'; ctx.strokeStyle = 'rgba(245,158,11,0.7)'; ctx.lineWidth = 1;
  rects.forEach(function(r){ ctx.fillRect(r.x,r.y,r.w,r.h); ctx.strokeRect(r.x,r.y,r.w,r.h); });
}

function clearSearch() {
  searchResults = []; currentSearchIdx = -1;
  for (var n = 1; n <= numPages; n++) {
    var wrap = document.getElementById('pg'+n); if (!wrap) continue;
    wrap.classList.remove('search-match');
    var scv = wrap.querySelector('.srch-cv');
    if (scv) scv.getContext('2d').clearRect(0,0,scv.width,scv.height);
  }
}

function gotoResult(idx) {
  if (idx < 0 || idx >= searchResults.length) return;
  currentSearchIdx = idx; goto(searchResults[idx].page);
}

// ── Sticky Notes ──────────────────────────────────────────────────────────
function loadNotes(notesList) {
  // Remove existing pins
  document.querySelectorAll('.note-pin').forEach(function(el) { el.remove(); });
  notes = {};
  notesList.forEach(function(note) {
    notes[note.id] = note;
    var wrap = document.getElementById('pg' + note.page);
    var ps = pageSize[note.page];
    if (wrap && ps) renderNotePin(note, wrap, ps.cssW, ps.cssH);
  });
}

function addNote(note) {
  notes[note.id] = note;
  var wrap = document.getElementById('pg' + note.page);
  var ps = pageSize[note.page];
  if (wrap && ps) renderNotePin(note, wrap, ps.cssW, ps.cssH);
}

function updateNote(id, color, text) {
  if (!notes[id]) return;
  notes[id].color = color; notes[id].text = text;
  var pin = document.getElementById('np-' + id);
  if (pin) pin.style.background = color;
}

function deleteNote(id) {
  delete notes[id];
  var pin = document.getElementById('np-' + id);
  if (pin) { pin.style.transform = 'translate(-13px,-13px) scale(0)'; setTimeout(function(){ pin.remove(); }, 200); }
}

function renderNotePin(note, wrap, cssW, cssH) {
  var existing = document.getElementById('np-' + note.id);
  if (existing) existing.remove();

  var pin = document.createElement('div');
  pin.id = 'np-' + note.id;
  pin.className = 'note-pin';
  pin.style.left = (note.x * cssW) + 'px';
  pin.style.top = (note.y * cssH) + 'px';
  pin.style.background = note.color;
  pin.textContent = '✎';
  pin.style.color = 'rgba(0,0,0,0.7)';
  pin.addEventListener('click', function(e) {
    e.stopPropagation();
    rn({ type: 'NOTE_TAP', id: note.id });
  });
  wrap.appendChild(pin);
}

// ── Long Press (note creation) ────────────────────────────────────────────
function setupLongPress(wrap, n, cssW, cssH) {
  var timer = null; var sx = 0, sy = 0;
  wrap.addEventListener('touchstart', function(e) {
    if (tool !== 'none') return;
    var touch = e.touches[0];
    var rect = wrap.getBoundingClientRect();
    sx = (touch.clientX - rect.left) / cssW;
    sy = (touch.clientY - rect.top) / cssH;
    timer = setTimeout(function() {
      timer = null;
      // Show ripple
      var ripple = document.createElement('div');
      ripple.className = 'press-ripple';
      ripple.style.left = (sx * cssW) + 'px';
      ripple.style.top = (sy * cssH) + 'px';
      wrap.appendChild(ripple);
      setTimeout(function() { ripple.remove(); }, 700);
      rn({ type: 'LONG_PRESS', page: n, x: sx, y: sy });
    }, 580);
  }, { passive: true });

  function cancel() { if (timer) { clearTimeout(timer); timer = null; } }
  wrap.addEventListener('touchmove', cancel, { passive: true });
  wrap.addEventListener('touchend', cancel, { passive: true });
  wrap.addEventListener('touchcancel', cancel, { passive: true });
}

// ── Annotation Drawing ────────────────────────────────────────────────────
var shapeStart = null;
var shapeSnapshot = null;

function setupDraw(cv, n) {
  var ctx = cv.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  function pt(t) {
    var r = cv.getBoundingClientRect();
    return { x:(t.clientX-r.left)*(cv.width/r.width), y:(t.clientY-r.top)*(cv.height/r.height) };
  }

  cv.addEventListener('touchstart', function(e) {
    if (tool === 'none') return;
    e.preventDefault(); e.stopPropagation();
    if (tool === 'shape') {
      shapeStart = pt(e.touches[0]);
      shapeSnapshot = ctx.getImageData(0, 0, cv.width, cv.height);
      activeCvs = cv;
      return;
    }
    drawing = true; activeCvs = cv;
    var p = pt(e.touches[0]); applyStyle(ctx); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  }, { passive: false });

  cv.addEventListener('touchmove', function(e) {
    if (activeCvs !== cv) return;
    e.preventDefault();
    if (tool === 'shape' && shapeStart && shapeSnapshot) {
      var p = pt(e.touches[0]);
      ctx.putImageData(shapeSnapshot, 0, 0);
      drawShape(ctx, shapeStart, p, true);
      return;
    }
    if (!drawing) return;
    var p = pt(e.touches[0]); ctx.lineTo(p.x, p.y); ctx.stroke();
  }, { passive: false });

  function end(e) {
    if (activeCvs !== cv) return;
    if (tool === 'shape' && shapeStart && shapeSnapshot) {
      var touch = e.changedTouches && e.changedTouches[0];
      if (touch) {
        var p = pt(touch);
        ctx.putImageData(shapeSnapshot, 0, 0);
        drawShape(ctx, shapeStart, p, false);
      }
      shapeStart = null; shapeSnapshot = null; activeCvs = null;
      drawings[n] = cv.toDataURL('image/png');
      rn({ type: 'ANNOT', page: n, data: drawings[n] });
      return;
    }
    if (!drawing) return;
    drawing = false; activeCvs = null;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([0]);
    drawings[n] = cv.toDataURL('image/png');
    rn({ type: 'ANNOT', page: n, data: drawings[n] });
  }
  cv.addEventListener('touchend', end, { passive: true });
  cv.addEventListener('touchcancel', end, { passive: true });
}

function drawShape(ctx, start, end, preview) {
  ctx.save();
  ctx.strokeStyle = drawColor;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = preview ? 0.65 : 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.setLineDash(preview ? [6, 4] : [0]);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (shapeType === 'line') {
    ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
  } else if (shapeType === 'rect') {
    ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
  } else if (shapeType === 'circle') {
    var cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
    var rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}

function applyStyle(ctx) {
  ctx.setLineDash([0]);
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 28; ctx.globalAlpha = 1;
  } else if (tool === 'highlight') {
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = drawColor; ctx.lineWidth = 22; ctx.globalAlpha = 0.36;
  } else if (tool === 'underline') {
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = drawColor; ctx.lineWidth = 2.5; ctx.globalAlpha = 1;
  } else if (tool === 'strikethrough') {
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = drawColor; ctx.lineWidth = 2.5; ctx.globalAlpha = 1;
  } else {
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = drawColor; ctx.lineWidth = 3; ctx.globalAlpha = 1;
  }
}

// ── Navigation ────────────────────────────────────────────────────────────
function goto(n) { var el = document.getElementById('pg'+n); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }
function clearAnnot(n) {
  delete drawings[n];
  var wrap = document.getElementById('pg'+n); if (!wrap) return;
  var av = wrap.querySelector('.ann-cv'); if (av) av.getContext('2d').clearRect(0,0,av.width,av.height);
}
function restoreAnnot(n, dataUrl) {
  drawings[n] = dataUrl;
  var wrap = document.getElementById('pg'+n); if (!wrap) return;
  var av = wrap.querySelector('.ann-cv'); if (!av) return;
  var img = new Image(); img.onload = function(){ av.getContext('2d').drawImage(img,0,0); }; img.src = dataUrl;
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
        var c = el.offsetTop + el.offsetHeight/2; var d = Math.abs(c-mid);
        if (d < minD) { minD = d; best = parseInt(el.dataset.page); }
      });
      if (best !== lastPage) { lastPage = best; rn({ type:'PAGE', page:best }); }
    });
  });
}

rn({ type: 'READY' });
</script>
</body>
</html>`;
};
