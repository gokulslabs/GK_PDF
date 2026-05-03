export const getPdfViewerHtml = (darkMode: boolean): string => {
  const bg = darkMode ? "#1C1C1E" : "#E8E8E8";
  const textColor = darkMode ? "#fff" : "#111";
  const spinnerBorder = darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const inputBg = darkMode ? "#0F1117" : "#F8F9FA";
  const cardBg = darkMode ? "#1A1D2E" : "#fff";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=10.0,user-scalable=yes">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{background:${bg}}
body{background:${bg};font-family:-apple-system,system-ui,sans-serif;min-height:100vh}
#loading{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};color:${textColor};gap:14px;z-index:999}
.spinner{width:38px;height:38px;border:3px solid ${spinnerBorder};border-top-color:#3B82F6;border-radius:50%;animation:spin .75s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#scroll-wrap{width:100%;min-height:100vh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;display:none}
#scroll-wrap.single{scroll-snap-type:y mandatory;height:100vh;overflow-y:scroll}
#scroll-wrap.single #pages{padding:0;gap:0}
#scroll-wrap.single .page-wrap{scroll-snap-align:start;min-height:100vh;display:flex;align-items:center;justify-content:center}
#pages{padding:8px;display:flex;flex-direction:column;align-items:center;gap:10px}
.page-wrap{position:relative;background:#fff;border-radius:3px;box-shadow:0 2px 16px rgba(0,0,0,${darkMode ? "0.55" : "0.18"});overflow:visible;flex-shrink:0}
.page-clip{position:relative;overflow:hidden;border-radius:3px}
.page-wrap.search-match{box-shadow:0 0 0 2.5px #FBBF24,0 2px 16px rgba(0,0,0,${darkMode ? "0.55" : "0.18"})}
.pdf-cv{display:block}
.srch-cv{position:absolute;top:0;left:0;pointer-events:none;z-index:1}
.ann-cv{position:absolute;top:0;left:0;z-index:2}
.form-layer{position:absolute;top:0;left:0;z-index:3;overflow:hidden;pointer-events:auto}
.form-field{position:absolute;background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.35);border-radius:2px;font-family:Arial,sans-serif;font-size:11px;outline:none;padding:1px 3px;color:#111;resize:none;overflow:hidden}
.form-field:focus{background:rgba(59,130,246,.13);border-color:#3B82F6;box-shadow:0 0 0 2px rgba(59,130,246,.18)}
input.form-field[type="checkbox"],input.form-field[type="radio"]{width:100%;height:100%;margin:0;padding:0;cursor:pointer;appearance:auto}
select.form-field{padding:0 2px}
.note-pin{position:absolute;z-index:20;width:26px;height:26px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2.5px solid rgba(255,255,255,.85);transform:translate(-13px,-13px);transition:transform .15s,box-shadow .15s;user-select:none}
.note-pin:active{transform:translate(-13px,-13px) scale(1.25);box-shadow:0 4px 14px rgba(0,0,0,.45)}
.press-ripple{position:absolute;z-index:15;width:36px;height:36px;border-radius:50%;background:rgba(99,102,241,.3);transform:translate(-18px,-18px);animation:ripple .6s ease-out forwards;pointer-events:none}
@keyframes ripple{0%{opacity:1;transform:translate(-18px,-18px) scale(.5)}100%{opacity:0;transform:translate(-18px,-18px) scale(2.5)}}
.snap-rect{position:absolute;pointer-events:none;z-index:10;border:1.5px dashed rgba(59,130,246,.85);background:rgba(59,130,246,.08);border-radius:2px}
.txt-overlay{position:absolute;z-index:25;background:rgba(255,255,255,.93);border:1.5px solid #3B82F6;border-radius:4px;padding:3px 6px;font-size:13px;color:#111;outline:none;min-width:80px;min-height:24px;resize:both;overflow:auto;box-shadow:0 2px 10px rgba(0,0,0,.15)}
#err{display:none;position:fixed;inset:0;background:${bg};flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#EF4444;text-align:center;padding:28px;font-size:14px}
.err-icon{font-size:36px;margin-bottom:4px}
#pwd-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1000;align-items:center;justify-content:center}
#pwd-box{background:${cardBg};border-radius:16px;padding:28px 24px;width:290px;display:flex;flex-direction:column;gap:14px}
#pwd-title{font-size:17px;font-weight:700;color:${textColor}}
#pwd-msg{font-size:13px;color:${textColor};opacity:.65}
#pwd-input{border:1.5px solid rgba(59,130,246,.4);border-radius:9px;padding:11px 13px;font-size:14px;background:${inputBg};color:${textColor};outline:none}
#pwd-input:focus{border-color:#3B82F6}
#pwd-submit{background:#3B82F6;color:#fff;border:none;border-radius:9px;padding:11px;font-size:14px;font-weight:600;cursor:pointer}
#pwd-submit:hover{background:#2563EB}
</style>
</head>
<body>
<div id="loading"><div class="spinner"></div><span style="font-size:13px;opacity:.65">Loading PDF…</span></div>
<div id="err"><div class="err-icon">⚠</div><div id="err-msg">Failed to load PDF</div></div>
<div id="pwd-overlay">
  <div id="pwd-box">
    <div id="pwd-title">🔒 Password Required</div>
    <div id="pwd-msg">This PDF is password-protected.</div>
    <input id="pwd-input" type="password" placeholder="Enter password…">
    <button id="pwd-submit">Unlock</button>
  </div>
</div>
<div id="scroll-wrap"><div id="pages"></div></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" crossorigin="anonymous"></script>
<script>
var DARK=${darkMode ? "true" : "false"};
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── State ─────────────────────────────────────────────────────────────────
var pdfDoc=null,numPages=0,pdfBuf=null;
var tool='none',drawColor='#FFEB3B';
var drawings={};        // page → canvas dataURL (all annotation types merged)
var textAnnots={};      // page → [{x,y,text,color,size}]
var stampData={};       // page → [{cx,cy,type}]
var drawing=false,activeCvs=null;
var shapeStart=null,shapeSnapshot=null;
var snapStart=null,snapSnapshot=null;
var textIndex={};       // page → [{str,x,y,w,h}] in CSS px
var pageSize={};        // page → {cssW,cssH}
var pageVP={};          // page → {vp,dpr,cssW,cssH}
var searchResults=[],currentSearchIdx=-1;
var notes={};
var shapeType='rect';   // 'line'|'rect'|'circle'|'arrow'
var stampType='approved';
var baseScale=1.0;      // fit-to-width multiplier (pre-DPR)
var userScale=1.0;      // user zoom multiplier
var pageRotation=0;     // 0|90|180|270
var viewMode='continuous';
var pwdCb=null;
var globalUndoStack=[];  // [{page, data}] state BEFORE each op
var MAX_UNDO=20;

// ── Bridge ─────────────────────────────────────────────────────────────────
function rn(data){
  var s=JSON.stringify(data);
  try{ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s); else window.parent.postMessage(s,'*'); }catch(e){}
}
function recv(raw){
  var msg; try{ msg=JSON.parse(raw); }catch(e){ return; }
  switch(msg.type){
    case 'LOAD':           loadPDF(msg.data);                        break;
    case 'TOOL':           setTool(msg.value);                       break;
    case 'COLOR':          drawColor=msg.value;                      break;
    case 'GOTO':           goto(msg.page);                           break;
    case 'DARK':           applyDark(msg.value);                     break;
    case 'CLEAR':          clearAnnot(msg.page);                     break;
    case 'RESTORE':        restoreAnnot(msg.page,msg.data);          break;
    case 'SEARCH':         doSearch(msg.query);                      break;
    case 'SEARCH_GOTO':    gotoResult(msg.index);                    break;
    case 'SEARCH_CLEAR':   clearSearch();                            break;
    case 'SHAPE_TYPE':     shapeType=msg.value;                      break;
    case 'STAMP_TYPE':     stampType=msg.value;                      break;
    case 'LOAD_NOTES':     loadNotes(msg.notes);                     break;
    case 'ADD_NOTE':       addNote(msg.note);                        break;
    case 'UPDATE_NOTE':    updateNote(msg.id,msg.color,msg.text);    break;
    case 'DELETE_NOTE':    deleteNote(msg.id);                       break;
    case 'ZOOM_IN':        setUserScale(userScale*1.25);             break;
    case 'ZOOM_OUT':       setUserScale(userScale/1.25);             break;
    case 'ZOOM_FIT_WIDTH': setUserScale(1.0);                        break;
    case 'ZOOM_FIT_PAGE':  fitPage();                                break;
    case 'ZOOM_ACTUAL':    setUserScale(1/(baseScale||1));           break;
    case 'ZOOM':           setUserScale(msg.value);                  break;
    case 'ROTATE':         rotatePage(msg.delta||90);                break;
    case 'VIEW_MODE':      setViewMode(msg.value);                   break;
    case 'SET_PASSWORD':   if(pwdCb){ pwdCb(msg.value); pwdCb=null; } break;
    case 'UNDO':           undoLast();                                break;
  }
}
window.addEventListener('message',function(e){ recv(e.data); });
document.addEventListener('message',function(e){ recv(e.data); });

// ── Tool ──────────────────────────────────────────────────────────────────
var CURSORS={none:'default',draw:'crosshair',highlight:'text',underline:'text',
  strikethrough:'text',eraser:'cell',shape:'crosshair',textbox:'text',stamp:'copy'};
function setTool(v){
  tool=v;
  var cur=CURSORS[v]||'crosshair';
  document.querySelectorAll('.ann-cv').forEach(function(c){
    c.style.pointerEvents=v==='none'?'none':'auto';
    c.style.touchAction=v==='none'?'auto':'none';
    c.style.cursor=cur;
  });
  document.querySelectorAll('.form-layer').forEach(function(fl){
    fl.style.pointerEvents=v==='none'?'auto':'none';
  });
}

// ── Error ─────────────────────────────────────────────────────────────────
function showErr(msg){
  document.getElementById('loading').style.display='none';
  var el=document.getElementById('err'); el.style.display='flex';
  document.getElementById('err-msg').textContent=msg;
  rn({type:'ERROR',message:msg});
}

// ── Password ──────────────────────────────────────────────────────────────
function showPwdDialog(retry){
  document.getElementById('loading').style.display='none';
  document.getElementById('pwd-msg').textContent=retry?'Incorrect password. Try again.':'This PDF is password-protected.';
  document.getElementById('pwd-input').value='';
  document.getElementById('pwd-overlay').style.display='flex';
  rn({type:'PASSWORD_REQUIRED',retry:!!retry});
  setTimeout(function(){ document.getElementById('pwd-input').focus(); },80);
}
function submitPwd(){
  var pw=document.getElementById('pwd-input').value; if(!pw) return;
  document.getElementById('pwd-overlay').style.display='none';
  document.getElementById('loading').style.display='flex';
  if(pwdCb){ pwdCb(pw); pwdCb=null; }
}
document.getElementById('pwd-submit').addEventListener('click',submitPwd);
document.getElementById('pwd-input').addEventListener('keydown',function(e){ if(e.key==='Enter') submitPwd(); });

// ── Load PDF ──────────────────────────────────────────────────────────────
async function loadPDF(b64){
  try{
    var bin=atob(b64);
    pdfBuf=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) pdfBuf[i]=bin.charCodeAt(i);
    await openDoc();
  }catch(e){ showErr(String(e.message||e)); }
}
async function openDoc(){
  try{
    var task=pdfjsLib.getDocument({data:pdfBuf});
    task.onPassword=function(cb,reason){ pwdCb=cb; showPwdDialog(reason===2); };
    pdfDoc=await task.promise;
    numPages=pdfDoc.numPages;
    document.getElementById('loading').style.display='none';
    document.getElementById('scroll-wrap').style.display='block';
    // Compute base scale (fit page width)
    var fp=await pdfDoc.getPage(1);
    var vp0=fp.getViewport({scale:1,rotation:pageRotation});
    baseScale=(window.innerWidth-16)/vp0.width;
    rn({type:'LOADED',pages:numPages});
    rn({type:'SCALE',value:Math.round(userScale*100)});
    await renderAll();
    setupScroll();
    renderThumbs();
    extractOutline();
  }catch(e){
    if(e&&e.name!=='PasswordException') showErr(String(e.message||e));
  }
}

// ── Zoom / Rotate / View ──────────────────────────────────────────────────
async function setUserScale(v){
  userScale=Math.max(0.2,Math.min(8,v));
  rn({type:'SCALE',value:Math.round(userScale*100)});
  await reRenderAll();
}
async function fitPage(){
  if(!pdfDoc) return;
  var fp=await pdfDoc.getPage(1);
  var vp0=fp.getViewport({scale:1,rotation:pageRotation});
  var sw=(window.innerWidth-16)/vp0.width;
  var sh=(window.innerHeight-16)/vp0.height;
  await setUserScale(Math.min(sw,sh)/baseScale);
}
async function rotatePage(delta){
  pageRotation=((pageRotation+delta)+360)%360;
  if(pdfDoc){
    var fp=await pdfDoc.getPage(1);
    var vp0=fp.getViewport({scale:1,rotation:pageRotation});
    baseScale=(window.innerWidth-16)/vp0.width;
  }
  rn({type:'SCALE',value:Math.round(userScale*100)});
  await reRenderAll();
}
function setViewMode(mode){
  viewMode=mode;
  var sc=document.getElementById('scroll-wrap');
  if(mode==='single') sc.classList.add('single'); else sc.classList.remove('single');
}
async function reRenderAll(){
  document.getElementById('pages').innerHTML='';
  pageSize={}; pageVP={};
  await renderAll();
}

// ── Render ────────────────────────────────────────────────────────────────
async function renderAll(){
  if(!pdfDoc) return;
  var dpr=Math.min(window.devicePixelRatio||1,2);
  for(var i=1;i<=numPages;i++) await renderPage(i,dpr);
  // Restore annotation drawings
  Object.keys(drawings).forEach(function(p){
    var n=parseInt(p); if(!drawings[n]) return;
    var wrap=document.getElementById('pg'+n); if(!wrap) return;
    var av=wrap.querySelector('.ann-cv'); if(!av) return;
    var img=new Image();
    img.onload=function(){ av.getContext('2d').drawImage(img,0,0); };
    img.src=drawings[n];
  });
  // Restore text boxes
  Object.keys(textAnnots).forEach(function(p){ redrawTextAnnots(parseInt(p)); });
  // Restore stamps
  Object.keys(stampData).forEach(function(p){ redrawStamps(parseInt(p)); });
  // Restore notes
  Object.values(notes).forEach(function(note){
    var wrap=document.getElementById('pg'+note.page);
    var ps=pageSize[note.page];
    if(wrap&&ps) renderNotePin(note,wrap,ps.cssW,ps.cssH);
  });
}

async function renderPage(n,dpr){
  var page=await pdfDoc.getPage(n);
  var sc=baseScale*userScale*dpr;
  var vp=page.getViewport({scale:sc,rotation:pageRotation});
  var cssW=Math.round(vp.width/dpr);
  var cssH=Math.round(vp.height/dpr);
  pageSize[n]={cssW:cssW,cssH:cssH};
  pageVP[n]={vp:vp,dpr:dpr,cssW:cssW,cssH:cssH};

  var wrap=document.createElement('div');
  wrap.className='page-wrap'; wrap.id='pg'+n; wrap.dataset.page=String(n);
  wrap.style.width=cssW+'px'; wrap.style.height=cssH+'px';

  var clip=document.createElement('div');
  clip.className='page-clip';
  clip.style.width=cssW+'px'; clip.style.height=cssH+'px';
  wrap.appendChild(clip);

  // PDF canvas
  var cv=document.createElement('canvas');
  cv.className='pdf-cv'; cv.width=vp.width; cv.height=vp.height;
  cv.style.width=cssW+'px'; cv.style.height=cssH+'px';
  clip.appendChild(cv);

  // Search highlight canvas
  var scv=document.createElement('canvas');
  scv.className='srch-cv'; scv.width=cssW; scv.height=cssH;
  scv.style.width=cssW+'px'; scv.style.height=cssH+'px';
  clip.appendChild(scv);

  // Annotation canvas
  var av=document.createElement('canvas');
  av.className='ann-cv'; av.width=cssW; av.height=cssH;
  av.style.width=cssW+'px'; av.style.height=cssH+'px';
  av.style.pointerEvents=tool==='none'?'none':'auto';
  av.style.cursor=CURSORS[tool]||'default';
  clip.appendChild(av);

  // AcroForm layer
  var fl=document.createElement('div');
  fl.className='form-layer';
  fl.style.width=cssW+'px'; fl.style.height=cssH+'px';
  fl.style.pointerEvents=tool==='none'?'auto':'none';
  clip.appendChild(fl);

  document.getElementById('pages').appendChild(wrap);

  // Render PDF page
  var ctx=cv.getContext('2d');
  if(DARK) ctx.filter='invert(1) hue-rotate(180deg)';
  await page.render({canvasContext:ctx,viewport:vp}).promise;

  await buildTextIndex(n,page,vp,dpr);
  await renderForms(n,page,fl,vp,dpr,cssW,cssH);
  setupDraw(av,n,cssW,cssH,wrap);
  setupLongPress(wrap,n,cssW,cssH);
}

// ── Text Index ────────────────────────────────────────────────────────────
async function buildTextIndex(n,page,vp,dpr){
  try{
    var tc=await page.getTextContent({normalizeWhitespace:true});
    var items=[];
    tc.items.forEach(function(item){
      if(!item.str||!item.str.trim()) return;
      var tx=pdfjsLib.Util.transform(vp.transform,item.transform);
      var fsPx=Math.sqrt(tx[2]*tx[2]+tx[3]*tx[3])||Math.abs(tx[0]);
      var wPx=item.width>0?item.width*Math.abs(tx[0]/(item.transform[0]||1)):fsPx*item.str.length*0.55;
      var ix=tx[4]/dpr, iy=(tx[5]-fsPx)/dpr;
      var iw=Math.max(wPx/dpr,4), ih=Math.max(fsPx*1.3/dpr,7);
      var str=item.str;
      var totalLen=str.length||1;
      // Split each text run into individual words so a tap on one word
      // doesn't snap to the whole sentence.
      var charOffset=0;
      str.split(/(\s+)/).forEach(function(tok){
        if(!tok){ return; }
        if(!tok.trim()){ charOffset+=tok.length; return; } // skip whitespace tokens
        var startFrac=charOffset/totalLen;
        var wordFrac=tok.length/totalLen;
        items.push({
          str:tok,
          x:ix+startFrac*iw,
          y:iy,
          w:Math.max(wordFrac*iw,4),
          h:ih,
        });
        charOffset+=tok.length;
      });
    });
    textIndex[n]=items;
  }catch(e){ textIndex[n]=[]; }
}

// ── AcroForm Rendering ────────────────────────────────────────────────────
async function renderForms(n,page,fl,vp,dpr,cssW,cssH){
  try{
    var annots=await page.getAnnotations({intent:'display'});
    annots.forEach(function(annot){
      if(annot.subtype!=='Widget'||!annot.rect) return;
      var r=annot.rect;
      var p1=vp.convertToViewportPoint(r[0],r[1]);
      var p2=vp.convertToViewportPoint(r[2],r[3]);
      var left=Math.min(p1[0],p2[0])/dpr;
      var top=Math.min(p1[1],p2[1])/dpr;
      var width=Math.abs(p2[0]-p1[0])/dpr;
      var height=Math.abs(p2[1]-p1[1])/dpr;
      if(width<2||height<2) return;
      var el;
      var ft=annot.fieldType;
      if(ft==='Btn'){
        el=document.createElement('input');
        el.type=annot.checkBox?'checkbox':annot.radioButton?'radio':'button';
        if(el.type==='button') el.value=annot.buttonValue||'';
        el.checked=!!(annot.fieldValue);
      } else if(ft==='Ch'){
        el=document.createElement('select');
        (annot.options||[]).forEach(function(opt){
          var o=document.createElement('option');
          o.value=opt.exportValue; o.textContent=opt.displayValue;
          if(opt.exportValue===annot.fieldValue) o.selected=true;
          el.appendChild(o);
        });
      } else if(annot.multiLine){
        el=document.createElement('textarea');
        el.value=String(annot.fieldValue||'');
        el.style.lineHeight='1.3';
      } else {
        el=document.createElement('input');
        el.type=annot.password?'password':'text';
        el.value=String(annot.fieldValue||'');
        el.placeholder=annot.alternativeText||'';
        if(annot.maxLen) el.maxLength=annot.maxLen;
        if(annot.readOnly) el.readOnly=true;
      }
      el.className='form-field';
      el.style.left=left+'px'; el.style.top=top+'px';
      el.style.width=width+'px'; el.style.height=height+'px';
      el.style.fontSize=Math.max(8,Math.min(height*0.65,14))+'px';
      fl.appendChild(el);
    });
  }catch(e){}
}

// ── Outline Extraction ────────────────────────────────────────────────────
async function extractOutline(){
  try{
    var outline=await pdfDoc.getOutline();
    if(!outline||!outline.length){ rn({type:'OUTLINE',items:[]}); return; }
    var flat=await flattenOutline(outline,0);
    rn({type:'OUTLINE',items:flat});
  }catch(e){ rn({type:'OUTLINE',items:[]}); }
}
async function flattenOutline(items,depth){
  var result=[];
  for(var i=0;i<items.length;i++){
    var item=items[i];
    var page=0;
    try{
      var dest=item.dest;
      if(typeof dest==='string') dest=await pdfDoc.getDestination(dest);
      if(Array.isArray(dest)&&dest[0]) page=(await pdfDoc.getPageIndex(dest[0]))+1;
    }catch(e){}
    result.push({title:item.title||'',page:page,depth:depth});
    if(item.items&&item.items.length){
      var kids=await flattenOutline(item.items,depth+1);
      kids.forEach(function(c){ result.push(c); });
    }
  }
  return result;
}

// ── Thumbnails ────────────────────────────────────────────────────────────
async function renderThumbs(){
  var thumbW=68;
  for(var n=1;n<=numPages;n++){
    try{
      var page=await pdfDoc.getPage(n);
      var vp0=page.getViewport({scale:1});
      var vp=page.getViewport({scale:thumbW/vp0.width});
      var cv=document.createElement('canvas');
      cv.width=Math.round(vp.width); cv.height=Math.round(vp.height);
      await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      rn({type:'THUMB',page:n,data:cv.toDataURL('image/jpeg',.6),w:cv.width,h:cv.height});
    }catch(e){}
  }
}

// ── Search ────────────────────────────────────────────────────────────────
async function doSearch(query){
  clearSearch();
  if(!pdfDoc||!query||!query.trim()){ rn({type:'SEARCH_DONE',results:[],total:0}); return; }
  var lq=query.toLowerCase(); var results=[];
  for(var n=1;n<=numPages;n++){
    var items=textIndex[n]||[];
    var matched=items.filter(function(it){ return it.str.toLowerCase().indexOf(lq)!==-1; });
    if(!matched.length){
      // Fallback: join all words with spaces so phrase-level queries still work
      var full=items.map(function(i){ return i.str; }).join(' ').toLowerCase();
      if(full.indexOf(lq)!==-1) matched=items;
    }
    if(matched.length){
      results.push({page:n,count:matched.length,rects:matched.map(function(it){ return {x:it.x,y:it.y,w:it.w,h:it.h}; })});
      drawSearchHL(n,results[results.length-1].rects);
    }
  }
  searchResults=results;
  rn({type:'SEARCH_DONE',results:results.map(function(r){ return {page:r.page,count:r.count}; }),total:results.length});
  if(results.length){ currentSearchIdx=0; goto(results[0].page); }
}
function drawSearchHL(n,rects){
  var wrap=document.getElementById('pg'+n); if(!wrap) return;
  wrap.classList.add('search-match');
  var scv=wrap.querySelector('.srch-cv'); if(!scv) return;
  var ctx=scv.getContext('2d'); ctx.clearRect(0,0,scv.width,scv.height);
  ctx.fillStyle='rgba(251,191,36,.38)'; ctx.strokeStyle='rgba(245,158,11,.7)'; ctx.lineWidth=1;
  rects.forEach(function(r){ ctx.fillRect(r.x,r.y,r.w,r.h); ctx.strokeRect(r.x,r.y,r.w,r.h); });
}
function clearSearch(){
  searchResults=[]; currentSearchIdx=-1;
  for(var n=1;n<=numPages;n++){
    var wrap=document.getElementById('pg'+n); if(!wrap) continue;
    wrap.classList.remove('search-match');
    var scv=wrap.querySelector('.srch-cv');
    if(scv) scv.getContext('2d').clearRect(0,0,scv.width,scv.height);
  }
}
function gotoResult(idx){
  if(idx<0||idx>=searchResults.length) return;
  currentSearchIdx=idx; goto(searchResults[idx].page);
}

// ── Text-snap Annotations ─────────────────────────────────────────────────
function isSnapTool(){ return tool==='highlight'||tool==='underline'||tool==='strikethrough'; }

function showSnapRect(wrap,x1,y1,x2,y2){
  var el=wrap.querySelector('.snap-rect');
  if(!el){ el=document.createElement('div'); el.className='snap-rect'; wrap.querySelector('.page-clip').appendChild(el); }
  var l=Math.min(x1,x2),t=Math.min(y1,y2);
  el.style.left=l+'px'; el.style.top=t+'px';
  el.style.width=Math.abs(x2-x1)+'px'; el.style.height=Math.abs(y2-y1)+'px';
}
function removeSnapRect(wrap){ var el=wrap.querySelector('.snap-rect'); if(el) el.remove(); }

function mergeWordsIntoLines(words){
  // Sort by top-y then left-x
  var sorted=words.slice().sort(function(a,b){ return a.y-b.y||a.x-b.x; });
  var lines=[];
  sorted.forEach(function(it){
    // Words whose y-centres are within half a typical line height are on the same line
    var cy=it.y+it.h/2;
    var line=null;
    for(var i=0;i<lines.length;i++){
      if(Math.abs(lines[i].cy-cy)<it.h*0.55){ line=lines[i]; break; }
    }
    if(line){
      line.x=Math.min(line.x,it.x);
      line.r=Math.max(line.r,it.x+it.w);
      line.y=Math.min(line.y,it.y);
      line.h=Math.max(line.h,it.h);
      // recalc centre so staggered baselines average out
      line.cy=line.y+line.h/2;
    } else {
      lines.push({cy:cy,x:it.x,r:it.x+it.w,y:it.y,h:it.h});
    }
  });
  return lines; // [{x, r, y, h}]
}

function commitSnap(n,cv,cssW,cssH,x1,y1,x2,y2){
  var items=textIndex[n]||[];
  var minX=Math.min(x1,x2)-4, maxX=Math.max(x1,x2)+4;
  var minY=Math.min(y1,y2)-8, maxY=Math.max(y1,y2)+8;
  var matched=items.filter(function(it){
    return it.x<maxX&&it.x+it.w>minX&&it.y<maxY&&it.y+it.h>minY;
  });
  var ctx=cv.getContext('2d');
  var sx=cv.width/cssW, sy=cv.height/cssH;
  ctx.save();
  ctx.strokeStyle=drawColor; ctx.fillStyle=drawColor;

  if(matched.length===0){
    // No text under selection — fall back to freehand rect / line
    if(tool==='highlight'){
      ctx.globalAlpha=0.38;
      ctx.fillRect(minX*sx,minY*sy,(maxX-minX)*sx,(maxY-minY)*sy);
    } else {
      ctx.globalAlpha=1; ctx.lineWidth=2.5*sx; ctx.lineCap='round';
      var fallY=tool==='underline'?(maxY*sy):((minY+maxY)/2*sy);
      ctx.beginPath(); ctx.moveTo(minX*sx,fallY); ctx.lineTo(maxX*sx,fallY); ctx.stroke();
    }
  } else {
    // Merge words into per-line bounding boxes → clean phrase highlight
    var lines=mergeWordsIntoLines(matched);
    lines.forEach(function(ln){
      var lx=ln.x*sx, ly=ln.y*sy, lw=(ln.r-ln.x)*sx, lh=ln.h*sy;
      if(tool==='highlight'){
        ctx.globalAlpha=0.38;
        ctx.fillRect(lx,ly,lw,lh);
      } else if(tool==='underline'){
        ctx.globalAlpha=1; ctx.lineWidth=2.5*sx; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(lx,ly+lh); ctx.lineTo(lx+lw,ly+lh); ctx.stroke();
      } else {
        // strikethrough
        ctx.globalAlpha=1; ctx.lineWidth=2.2*sx; ctx.lineCap='round';
        ctx.beginPath();
        var mid=ly+lh*0.55;
        ctx.moveTo(lx,mid); ctx.lineTo(lx+lw,mid); ctx.stroke();
      }
    });
  }
  ctx.restore();
  drawings[n]=cv.toDataURL('image/png');
  rn({type:'ANNOT',page:n,data:drawings[n]});
}

// ── Stamps ────────────────────────────────────────────────────────────────
var STAMPS={
  approved:    {label:'✓ APPROVED',    color:'#16a34a',border:'#15803d'},
  draft:       {label:'⟳ DRAFT',       color:'#2563eb',border:'#1d4ed8'},
  confidential:{label:'⚠ CONFIDENTIAL',color:'#dc2626',border:'#b91c1c'},
  reviewed:    {label:'✓ REVIEWED',    color:'#7c3aed',border:'#6d28d9'},
  urgent:      {label:'! URGENT',      color:'#ea580c',border:'#c2410c'},
};
function placeStamp(n,cssX,cssY,cssW,cssH){
  if(!stampData[n]) stampData[n]=[];
  stampData[n].push({cx:cssX,cy:cssY,type:stampType});
  var wrap=document.getElementById('pg'+n); if(!wrap) return;
  var cv=wrap.querySelector('.ann-cv'); if(!cv) return;
  var ps=pageSize[n]||{cssW:cssW,cssH:cssH};
  drawStampCtx(cv.getContext('2d'),cssX,cssY,stampType,cv.width/ps.cssW,cv.height/ps.cssH);
  drawings[n]=cv.toDataURL('image/png');
  rn({type:'ANNOT',page:n,data:drawings[n]});
  rn({type:'STAMP_ADDED',page:n,items:stampData[n]});
}
function drawStampCtx(ctx,cssX,cssY,type,sx,sy){
  var def=STAMPS[type]||STAMPS.draft;
  var cx=cssX*sx,cy=cssY*sy;
  var pw=130*sx,ph=40*sy;
  ctx.save();
  ctx.globalAlpha=0.88;
  ctx.strokeStyle=def.border; ctx.lineWidth=2*sx;
  ctx.strokeRect(cx-pw/2+1.5*sx,cy-ph/2+1.5*sy,pw-3*sx,ph-3*sy);
  ctx.strokeRect(cx-pw/2+4*sx,cy-ph/2+4*sy,pw-8*sx,ph-8*sy);
  ctx.fillStyle=def.color;
  var fs=Math.max(9,Math.min(ph*0.42,16))*sx;
  ctx.font='bold '+fs+'px Arial';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(def.label,cx,cy);
  ctx.restore();
}
function redrawStamps(n){
  var items=stampData[n]; if(!items||!items.length) return;
  var ps=pageSize[n]; if(!ps) return;
  var wrap=document.getElementById('pg'+n); if(!wrap) return;
  var cv=wrap.querySelector('.ann-cv'); if(!cv) return;
  var sx=cv.width/ps.cssW, sy=cv.height/ps.cssH;
  items.forEach(function(it){ drawStampCtx(cv.getContext('2d'),it.cx,it.cy,it.type,sx,sy); });
}

// ── Text Box Annotations ──────────────────────────────────────────────────
function placeTextBox(n,cssX,cssY,cssW,cssH,wrap){
  var clip=wrap.querySelector('.page-clip'); if(!clip) return;
  var ta=document.createElement('textarea');
  ta.className='txt-overlay';
  ta.style.left=cssX+'px'; ta.style.top=cssY+'px';
  ta.placeholder='Type here…';
  clip.appendChild(ta);
  setTimeout(function(){ ta.focus(); },50);
  var committed=false;
  function commit(){
    if(committed) return; committed=true;
    var txt=ta.value.trim(); ta.remove();
    if(!txt) return;
    if(!textAnnots[n]) textAnnots[n]=[];
    textAnnots[n].push({x:cssX,y:cssY,text:txt,color:drawColor,size:13});
    redrawTextAnnots(n);
    rn({type:'TEXT_ANNOT',page:n,items:textAnnots[n]});
  }
  ta.addEventListener('blur',commit);
  ta.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ committed=true; ta.value=''; ta.remove(); }
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); commit(); }
  });
}
function redrawTextAnnots(n){
  var items=textAnnots[n]; if(!items||!items.length) return;
  var ps=pageSize[n]; if(!ps) return;
  var wrap=document.getElementById('pg'+n); if(!wrap) return;
  var cv=wrap.querySelector('.ann-cv'); if(!cv) return;
  var ctx=cv.getContext('2d');
  var sx=cv.width/ps.cssW, sy=cv.height/ps.cssH;
  ctx.save();
  items.forEach(function(it){
    ctx.fillStyle=it.color; ctx.globalAlpha=1;
    ctx.font='bold '+(it.size*sx)+'px Arial';
    ctx.fillText(it.text,it.x*sx,(it.y+it.size)*sy);
  });
  ctx.restore();
}

// ── Long Press ────────────────────────────────────────────────────────────
function setupLongPress(wrap,n,cssW,cssH){
  var timer=null,sx=0,sy=0;
  function startTimer(cx,cy){
    if(tool!=='none') return;
    var rect=wrap.getBoundingClientRect();
    sx=(cx-rect.left)/cssW; sy=(cy-rect.top)/cssH;
    timer=setTimeout(function(){
      timer=null;
      var ripple=document.createElement('div');
      ripple.className='press-ripple';
      ripple.style.left=(sx*cssW)+'px'; ripple.style.top=(sy*cssH)+'px';
      wrap.appendChild(ripple);
      setTimeout(function(){ ripple.remove(); },700);
      rn({type:'LONG_PRESS',page:n,x:sx,y:sy});
    },580);
  }
  function cancel(){ if(timer){ clearTimeout(timer); timer=null; } }
  wrap.addEventListener('touchstart',function(e){ startTimer(e.touches[0].clientX,e.touches[0].clientY); },{passive:true});
  wrap.addEventListener('mousedown',function(e){ startTimer(e.clientX,e.clientY); });
  wrap.addEventListener('touchmove',cancel,{passive:true});
  wrap.addEventListener('touchend',cancel,{passive:true});
  wrap.addEventListener('touchcancel',cancel,{passive:true});
  wrap.addEventListener('mousemove',cancel);
  wrap.addEventListener('mouseup',cancel);
}

// ── Annotation Drawing ────────────────────────────────────────────────────
function setupDraw(cv,n,cssW,cssH,wrap){
  var ctx=cv.getContext('2d');
  ctx.lineCap='round'; ctx.lineJoin='round';

  function ptC(cx,cy){ // client coords → canvas px
    var r=cv.getBoundingClientRect();
    return {x:(cx-r.left)*(cv.width/r.width),y:(cy-r.top)*(cv.height/r.height)};
  }
  function ptCSS(cx,cy){ // client coords → CSS px relative to canvas
    var r=cv.getBoundingClientRect();
    return {x:cx-r.left,y:cy-r.top};
  }

  function onStart(cx,cy){
    if(tool==='none') return;
    if(tool==='textbox'){ var p=ptCSS(cx,cy); pushUndo(n); placeTextBox(n,p.x,p.y,cssW,cssH,wrap); return; }
    if(tool==='stamp'){   var p=ptCSS(cx,cy); pushUndo(n); placeStamp(n,p.x,p.y,cssW,cssH); return; }
    if(isSnapTool()){
      var p=ptCSS(cx,cy); pushUndo(n); snapStart=p; activeCvs=cv;
      snapSnapshot=ctx.getImageData(0,0,cv.width,cv.height); return;
    }
    if(tool==='shape'){
      pushUndo(n); shapeStart=ptC(cx,cy); activeCvs=cv;
      shapeSnapshot=ctx.getImageData(0,0,cv.width,cv.height); return;
    }
    pushUndo(n); drawing=true; activeCvs=cv;
    var p=ptC(cx,cy); applyStyle(ctx); ctx.beginPath(); ctx.moveTo(p.x,p.y);
  }
  function onMove(cx,cy){
    if(activeCvs!==cv) return;
    if(isSnapTool()&&snapStart){
      var p=ptCSS(cx,cy); showSnapRect(wrap,snapStart.x,snapStart.y,p.x,p.y); return;
    }
    if(tool==='shape'&&shapeStart&&shapeSnapshot){
      ctx.putImageData(shapeSnapshot,0,0); drawShape(ctx,shapeStart,ptC(cx,cy),true); return;
    }
    if(!drawing) return;
    var p=ptC(cx,cy); ctx.lineTo(p.x,p.y); ctx.stroke();
  }
  function onEnd(cx,cy){
    if(activeCvs!==cv) return;
    if(isSnapTool()&&snapStart){
      removeSnapRect(wrap);
      var pe=ptCSS(cx,cy);
      ctx.putImageData(snapSnapshot,0,0);
      commitSnap(n,cv,cssW,cssH,snapStart.x,snapStart.y,pe.x,pe.y);
      snapStart=null; snapSnapshot=null; activeCvs=null; return;
    }
    if(tool==='shape'&&shapeStart&&shapeSnapshot){
      ctx.putImageData(shapeSnapshot,0,0);
      drawShape(ctx,shapeStart,ptC(cx,cy),false);
      shapeStart=null; shapeSnapshot=null; activeCvs=null;
      drawings[n]=cv.toDataURL('image/png');
      rn({type:'ANNOT',page:n,data:drawings[n]}); return;
    }
    if(!drawing) return;
    drawing=false; activeCvs=null;
    ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; ctx.setLineDash([0]);
    drawings[n]=cv.toDataURL('image/png');
    rn({type:'ANNOT',page:n,data:drawings[n]});
  }

  // Touch
  cv.addEventListener('touchstart',function(e){ if(tool==='none') return; e.preventDefault(); e.stopPropagation(); onStart(e.touches[0].clientX,e.touches[0].clientY); },{passive:false});
  cv.addEventListener('touchmove', function(e){ if(activeCvs!==cv) return; e.preventDefault(); onMove(e.touches[0].clientX,e.touches[0].clientY); },{passive:false});
  cv.addEventListener('touchend',  function(e){ if(activeCvs!==cv) return; var t=e.changedTouches[0]; onEnd(t.clientX,t.clientY); },{passive:true});
  cv.addEventListener('touchcancel',function(e){ if(activeCvs!==cv) return; var t=e.changedTouches[0]; onEnd(t.clientX,t.clientY); },{passive:true});
  // Mouse
  cv.addEventListener('mousedown', function(e){ if(tool==='none') return; e.preventDefault(); onStart(e.clientX,e.clientY); });
  cv.addEventListener('mousemove', function(e){ onMove(e.clientX,e.clientY); });
  cv.addEventListener('mouseup',   function(e){ if(activeCvs===cv) onEnd(e.clientX,e.clientY); });
  cv.addEventListener('mouseleave',function(e){ if(activeCvs===cv) onEnd(e.clientX,e.clientY); });
}

// ── Shape Drawing ─────────────────────────────────────────────────────────
function drawShape(ctx,start,end,preview){
  ctx.save();
  ctx.strokeStyle=drawColor; ctx.lineWidth=2.5;
  ctx.globalAlpha=preview?.65:1;
  ctx.globalCompositeOperation='source-over';
  ctx.setLineDash(preview?[6,4]:[0]);
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  if(shapeType==='line'){
    ctx.moveTo(start.x,start.y); ctx.lineTo(end.x,end.y);
  } else if(shapeType==='rect'){
    ctx.rect(start.x,start.y,end.x-start.x,end.y-start.y);
  } else if(shapeType==='circle'){
    var cx=(start.x+end.x)/2,cy=(start.y+end.y)/2;
    var rx=Math.abs(end.x-start.x)/2,ry=Math.abs(end.y-start.y)/2;
    ctx.ellipse(cx,cy,Math.max(rx,1),Math.max(ry,1),0,0,Math.PI*2);
  } else if(shapeType==='arrow'){
    var dx=end.x-start.x,dy=end.y-start.y;
    var len=Math.sqrt(dx*dx+dy*dy); if(len<2){ ctx.restore(); return; }
    var ux=dx/len,uy=dy/len,hw=10,ha=18;
    ctx.moveTo(start.x,start.y); ctx.lineTo(end.x,end.y);
    ctx.moveTo(end.x,end.y); ctx.lineTo(end.x-ux*ha+uy*hw,end.y-uy*ha-ux*hw);
    ctx.moveTo(end.x,end.y); ctx.lineTo(end.x-ux*ha-uy*hw,end.y-uy*ha+ux*hw);
  }
  ctx.stroke(); ctx.restore();
}
function applyStyle(ctx){
  ctx.setLineDash([0]);
  if(tool==='eraser'){
    ctx.globalCompositeOperation='destination-out'; ctx.lineWidth=28; ctx.globalAlpha=1;
  } else {
    ctx.globalCompositeOperation='source-over'; ctx.strokeStyle=drawColor; ctx.lineWidth=3; ctx.globalAlpha=1;
  }
}

// ── Undo ──────────────────────────────────────────────────────────────────
function pushUndo(n){
  globalUndoStack.push({page:n,data:drawings[n]||null});
  if(globalUndoStack.length>MAX_UNDO) globalUndoStack.shift();
  rn({type:'UNDO_AVAILABLE',canUndo:true});
}
function undoLast(){
  if(!globalUndoStack.length){ rn({type:'UNDO_AVAILABLE',canUndo:false}); return; }
  var entry=globalUndoStack.pop();
  var n=entry.page;
  var wrap=document.getElementById('pg'+n);
  if(!wrap){ rn({type:'UNDO_AVAILABLE',canUndo:globalUndoStack.length>0}); return; }
  var av=wrap.querySelector('.ann-cv'); if(!av) return;
  var ctx=av.getContext('2d');
  ctx.clearRect(0,0,av.width,av.height);
  if(entry.data){
    drawings[n]=entry.data;
    var img=new Image(); img.onload=function(){ ctx.drawImage(img,0,0); }; img.src=entry.data;
  } else {
    delete drawings[n];
  }
  rn({type:'ANNOT',page:n,data:entry.data||null});
  rn({type:'UNDO_AVAILABLE',canUndo:globalUndoStack.length>0});
}

// ── Navigation ────────────────────────────────────────────────────────────
function goto(n){ var el=document.getElementById('pg'+n); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
function clearAnnot(n){
  delete drawings[n];
  var wrap=document.getElementById('pg'+n); if(!wrap) return;
  var av=wrap.querySelector('.ann-cv'); if(av) av.getContext('2d').clearRect(0,0,av.width,av.height);
}
function restoreAnnot(n,dataUrl){
  drawings[n]=dataUrl;
  var wrap=document.getElementById('pg'+n); if(!wrap) return;
  var av=wrap.querySelector('.ann-cv'); if(!av) return;
  var img=new Image(); img.onload=function(){ av.getContext('2d').drawImage(img,0,0); }; img.src=dataUrl;
}
function applyDark(v){
  DARK=v;
  document.body.style.background=v?'#1C1C1E':'#E8E8E8';
  document.getElementById('scroll-wrap').style.background=v?'#1C1C1E':'#E8E8E8';
}

// ── Scroll Tracking ───────────────────────────────────────────────────────
function setupScroll(){
  var sc=document.getElementById('scroll-wrap');
  var lastPage=1,rafId=null;
  sc.addEventListener('scroll',function(){
    if(rafId) return;
    rafId=requestAnimationFrame(function(){
      rafId=null;
      var mid=sc.scrollTop+sc.clientHeight/2;
      var pgs=document.querySelectorAll('.page-wrap');
      var best=1,minD=1e9;
      pgs.forEach(function(el){
        var c=el.offsetTop+el.offsetHeight/2,d=Math.abs(c-mid);
        if(d<minD){ minD=d; best=parseInt(el.dataset.page); }
      });
      if(best!==lastPage){ lastPage=best; rn({type:'PAGE',page:best}); }
    });
  });
}

// ── Sticky Notes ──────────────────────────────────────────────────────────
function loadNotes(notesList){
  document.querySelectorAll('.note-pin').forEach(function(el){ el.remove(); });
  notes={};
  notesList.forEach(function(note){
    notes[note.id]=note;
    var wrap=document.getElementById('pg'+note.page);
    var ps=pageSize[note.page];
    if(wrap&&ps) renderNotePin(note,wrap,ps.cssW,ps.cssH);
  });
}
function addNote(note){
  notes[note.id]=note;
  var wrap=document.getElementById('pg'+note.page);
  var ps=pageSize[note.page];
  if(wrap&&ps) renderNotePin(note,wrap,ps.cssW,ps.cssH);
}
function updateNote(id,color,text){
  if(!notes[id]) return;
  notes[id].color=color; notes[id].text=text;
  var pin=document.getElementById('np-'+id);
  if(pin) pin.style.background=color;
}
function deleteNote(id){
  delete notes[id];
  var pin=document.getElementById('np-'+id);
  if(pin){ pin.style.transform='translate(-13px,-13px) scale(0)'; setTimeout(function(){ pin.remove(); },200); }
}
function renderNotePin(note,wrap,cssW,cssH){
  var existing=document.getElementById('np-'+note.id); if(existing) existing.remove();
  var pin=document.createElement('div');
  pin.id='np-'+note.id; pin.className='note-pin';
  pin.style.left=(note.x*cssW)+'px'; pin.style.top=(note.y*cssH)+'px';
  pin.style.background=note.color; pin.textContent='✎';
  pin.style.color='rgba(0,0,0,0.7)';
  pin.addEventListener('click',function(e){ e.stopPropagation(); rn({type:'NOTE_TAP',id:note.id}); });
  wrap.appendChild(pin);
}

rn({type:'READY'});
</script>
</body>
</html>`;
};
