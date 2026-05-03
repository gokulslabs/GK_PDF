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
    }
    .pdf-cv { display: block; }
    .ann-cv {
      position: absolute; top: 0; left: 0;
      touch-action: none;
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

var pdfDoc = null, numPages = 0;
var tool = 'none', color = '#FFEB3B';
var drawings = {};
var drawing = false, activeCvs = null, lastPt = null;

function rn(data) {
  try { window.ReactNativeWebView.postMessage(JSON.stringify(data)); } catch(e) {}
}

function recv(raw) {
  var msg;
  try { msg = JSON.parse(raw); } catch(e) { return; }
  switch(msg.type) {
    case 'LOAD': loadPDF(msg.data); break;
    case 'TOOL': tool = msg.value; break;
    case 'COLOR': color = msg.value; break;
    case 'GOTO': goto(msg.page); break;
    case 'DARK': applyDark(msg.value); break;
    case 'CLEAR': clearAnnot(msg.page); break;
    case 'RESTORE': restoreAnnot(msg.page, msg.data); break;
  }
}

window.addEventListener('message', function(e) { recv(e.data); });
document.addEventListener('message', function(e) { recv(e.data); });

function showErr(msg) {
  document.getElementById('loading').style.display = 'none';
  var el = document.getElementById('err');
  el.style.display = 'flex';
  document.getElementById('err-msg').textContent = msg;
  rn({ type: 'ERROR', message: msg });
}

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
  } catch(e) {
    showErr(String(e && e.message ? e.message : e));
  }
}

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

  var wrap = document.createElement('div');
  wrap.className = 'page-wrap';
  wrap.id = 'pg' + n;
  wrap.dataset.page = n;
  wrap.style.width = cssW + 'px';
  wrap.style.height = cssH + 'px';

  var cv = document.createElement('canvas');
  cv.className = 'pdf-cv';
  cv.width = vp.width;
  cv.height = vp.height;
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  wrap.appendChild(cv);

  var av = document.createElement('canvas');
  av.className = 'ann-cv';
  av.width = cssW;
  av.height = cssH;
  av.style.width = cssW + 'px';
  av.style.height = cssH + 'px';
  wrap.appendChild(av);

  document.getElementById('pages').appendChild(wrap);

  var ctx = cv.getContext('2d');
  if (DARK) { ctx.filter = 'invert(1) hue-rotate(180deg)'; }
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  if (drawings[n]) {
    var img = new Image();
    img.onload = function() { av.getContext('2d').drawImage(img, 0, 0); };
    img.src = drawings[n];
  }

  setupDraw(av, n);
}

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
    lastPt = p;
  }, { passive: false });

  cv.addEventListener('touchmove', function(e) {
    if (!drawing || activeCvs !== cv) return;
    e.preventDefault();
    var p = pt(e.touches[0]);
    ctx.lineTo(p.x, p.y); ctx.stroke();
    lastPt = p;
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
    ctx.strokeStyle = color; ctx.lineWidth = 22; ctx.globalAlpha = 0.36;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 1;
  }
}

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
