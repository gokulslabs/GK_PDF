import { FIND_TEXT_MATCHES_SOURCE } from "@/utils/textSearch";
import { PDFJS_MAIN, PDFJS_WORKER } from "@/vendor/pdfjsSources";

const htmlCache = new Map<string, string>();

function embedScript(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

export function getPdfViewerHtml(darkMode: boolean): string {
  const key = darkMode ? "dark" : "light";
  const cached = htmlCache.get(key);
  if (cached) return cached;
  const html = buildHtml(darkMode);
  htmlCache.set(key, html);
  return html;
}

function buildHtml(darkMode: boolean): string {
  const bg = darkMode ? "#1C1C1E" : "#E8E8E8";
  const textColor = darkMode ? "#fff" : "#111";
  const spinnerBorder = darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;background:${bg}}
body{font-family:-apple-system,system-ui,sans-serif;color:${textColor}}
#loading{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};gap:14px;z-index:999}
.spinner{width:38px;height:38px;border:3px solid ${spinnerBorder};border-top-color:#3B82F6;border-radius:50%;animation:spin .75s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#scroll-wrap{height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;display:none}
#scroll-wrap.single{scroll-snap-type:y mandatory}
#pages{min-height:100%}
#scroll-wrap.single .page-slot{scroll-snap-align:start;scroll-snap-stop:always}
.page-slot{position:relative;width:100%;display:flex;justify-content:center;align-items:flex-start;padding:6px 0}
#scroll-wrap.single .page-slot{align-items:center;padding:0}
.pg-label{position:absolute;top:50%;left:0;right:0;text-align:center;color:rgba(127,127,127,.8);font-size:13px;pointer-events:none}
.page-slot.ready .pg-label{display:none}
.page-wrap{position:relative;background:#fff;border-radius:3px;box-shadow:0 2px 16px rgba(0,0,0,${darkMode ? "0.55" : "0.18"});flex-shrink:0}
.page-clip{position:relative;overflow:hidden;border-radius:3px}
.page-wrap.search-match{box-shadow:0 0 0 2.5px #FBBF24,0 2px 16px rgba(0,0,0,${darkMode ? "0.55" : "0.18"})}
.pdf-cv,.srch-cv,.ann-cv{position:absolute;top:0;left:0}
.pdf-cv{z-index:0}
.srch-cv{z-index:1;pointer-events:none}
.ann-cv{z-index:2}
.form-layer{position:absolute;top:0;left:0;z-index:3;overflow:hidden}
.form-field{position:absolute;background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.35);border-radius:2px;font-family:Arial,sans-serif;font-size:11px;outline:none;padding:1px 3px;color:#111;resize:none;overflow:hidden}
.form-field:focus{background:rgba(59,130,246,.13);border-color:#3B82F6}
input.form-field[type="checkbox"],input.form-field[type="radio"]{width:100%;height:100%;margin:0;padding:0}
.note-pin{position:absolute;z-index:20;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2.5px solid rgba(255,255,255,.85);transform:translate(-13px,-13px);user-select:none}
.snap-rect{position:absolute;pointer-events:none;z-index:10;border:1.5px dashed rgba(59,130,246,.85);background:rgba(59,130,246,.08)}
.txt-overlay{position:absolute;z-index:25;background:rgba(255,255,255,.96);border:1.5px solid #3B82F6;border-radius:4px;padding:3px 6px;font-size:13px;color:#111;outline:none;min-width:80px;min-height:24px}
.sel-handle{position:absolute;z-index:50;width:22px;height:22px;border-radius:50%;background:#3B82F6;border:2.5px solid #fff;transform:translate(-11px,-11px);touch-action:none}
.sel-toolbar{position:absolute;z-index:55;background:rgba(10,13,26,.93);border-radius:11px;padding:5px 7px;display:flex;gap:5px;transform:translateX(-50%)}
.sel-btn{border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;color:#fff}
.sel-btn.confirm{background:#3B82F6}
.sel-btn.cancel{background:rgba(255,255,255,.2)}
#err{display:none;position:fixed;inset:0;background:${bg};flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#EF4444;text-align:center;padding:28px;font-size:14px;z-index:1000}
</style>
</head>
<body>
<div id="loading"><div class="spinner"></div><span style="font-size:13px;opacity:.65">Loading PDF…</span></div>
<div id="err"><div id="err-msg">Failed to load PDF</div></div>
<div id="scroll-wrap"><div id="pages"></div></div>
<script>${embedScript(PDFJS_MAIN)}</script>
<script>${embedScript(PDFJS_WORKER)}</script>
<script>
${FIND_TEXT_MATCHES_SOURCE}
var DARK=${darkMode ? "true" : "false"};
var pdfDoc=null,numPages=0,pdfBuf=null,loadTask=null;
var tool="none",drawColor="#FFEB3B",shapeType="rect",stampType="approved";
var markup={},legacy={},formState={},notes={},textIndex={};
var pdfSize={},pageVP={},rendered={};
var baseScale=1,userScale=1,pageRotation=0,viewMode="continuous";
var pwdCb=null,slotsReady=false,layoutToken=0;
var globalUndoStack=[],MAX_UNDO=20;
var searchHits={},selection=null,selDrag=null,suppressTap=false;
var thumbsStarted=false;
var windowRunning=false,windowAgain=false;
var STAMPS={
  approved:{label:"APPROVED",color:"#16a34a"},
  draft:{label:"DRAFT",color:"#2563eb"},
  confidential:{label:"CONFIDENTIAL",color:"#dc2626"},
  reviewed:{label:"REVIEWED",color:"#7c3aed"},
  urgent:{label:"URGENT",color:"#ea580c"}
};

function rn(data){
  var s=JSON.stringify(data);
  try{
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else window.parent.postMessage(s,"*");
  }catch(e){}
}
function recv(raw){
  var msg; try{ msg=JSON.parse(raw);}catch(e){ return; }
  switch(msg.type){
    case "LOAD": loadPDF(msg.data); break;
    case "TOOL": setTool(msg.value); break;
    case "COLOR": drawColor=msg.value; break;
    case "GOTO": goto(msg.page); break;
    case "DARK": applyDark(!!msg.value); break;
    case "SEARCH": doSearch(msg.query); break;
    case "SEARCH_GOTO": gotoResult(msg.index); break;
    case "SEARCH_CLEAR": clearSearch(); break;
    case "SHAPE_TYPE": shapeType=msg.value; break;
    case "STAMP_TYPE": stampType=msg.value; break;
    case "LOAD_NOTES": loadNotes(msg.notes||[]); break;
    case "ADD_NOTE": addNote(msg.note); break;
    case "UPDATE_NOTE": updateNote(msg.id,msg.color,msg.text); break;
    case "DELETE_NOTE": deleteNote(msg.id); break;
    case "ZOOM_IN": setUserScale(userScale*1.25); break;
    case "ZOOM_OUT": setUserScale(userScale/1.25); break;
    case "ZOOM_FIT_WIDTH": setUserScale(1); break;
    case "ZOOM_FIT_PAGE": fitPage(); break;
    case "ZOOM_ACTUAL": setUserScale(1/(baseScale||1)); break;
    case "ZOOM": setUserScale(msg.value); break;
    case "ROTATE": rotatePage(msg.delta||90); break;
    case "VIEW_MODE": setViewMode(msg.value); break;
    case "SET_PASSWORD": if(pwdCb){ var cb=pwdCb; pwdCb=null; cb(msg.value); } break;
    case "CANCEL_PASSWORD": cancelPassword(); break;
    case "UNDO": undoLast(); break;
    case "RESTORE_MARKUP": markup[msg.page]=msg.ops||[]; if(rendered[msg.page]) paintMarkup(msg.page); break;
    case "RESTORE_LEGACY": if(msg.data){ legacy[msg.page]=msg.data; if(rendered[msg.page]) paintMarkup(msg.page); } break;
    case "LOAD_FORMS": formState=msg.values||{}; break;
    case "RENDER_THUMBS": startThumbs(); break;
  }
}
window.addEventListener("message",function(e){ if(typeof e.data==="string") recv(e.data); });
document.addEventListener("message",function(e){ recv(e.data); });

function showErr(msg){
  document.getElementById("loading").style.display="none";
  var el=document.getElementById("err");
  el.style.display="flex";
  document.getElementById("err-msg").textContent=msg;
  rn({type:"ERROR",message:msg});
}
function yieldThread(){ return new Promise(function(r){ setTimeout(r,0); }); }
function clampScale(v){ return Math.max(0.2, Math.min(8, v)); }
function cssSize(n){
  var box=pdfSize[n];
  return { w:Math.max(1,Math.round(box.w*baseScale*userScale)), h:Math.max(1,Math.round(box.h*baseScale*userScale)) };
}
function pdfToCss(n,x,y){
  var meta=pageVP[n];
  if(!meta) return {x:0,y:0};
  var pt=meta.vp.convertToViewportPoint(x,y);
  return { x:pt[0]/meta.dpr, y:pt[1]/meta.dpr };
}
function cssToPdf(n,x,y){
  var meta=pageVP[n];
  var pt=meta.vp.convertToPdfPoint(x*meta.dpr, y*meta.dpr);
  return { x:pt[0], y:pt[1] };
}
function cssLenToPdf(n,cssLen){
  var a=cssToPdf(n,0,0);
  var b=cssToPdf(n,cssLen,0);
  var c=cssToPdf(n,0,cssLen);
  return Math.max(Math.abs(b.x-a.x), Math.abs(c.y-a.y), 0.4);
}
function reportScale(){ rn({type:"SCALE", value:Math.round(userScale*100)}); }

var CURSORS={none:"default",draw:"crosshair",highlight:"text",underline:"text",strikethrough:"text",eraser:"cell",shape:"crosshair",textbox:"text",stamp:"copy"};
function setTool(v){
  clearSelection();
  tool=v;
  var cur=CURSORS[v]||"crosshair";
  var nodes=document.querySelectorAll(".ann-cv");
  for(var i=0;i<nodes.length;i++){
    nodes[i].style.pointerEvents=v==="none"?"none":"auto";
    nodes[i].style.touchAction=v==="none"?"auto":"none";
    nodes[i].style.cursor=cur;
  }
  var forms=document.querySelectorAll(".form-layer");
  for(var j=0;j<forms.length;j++) forms[j].style.pointerEvents=v==="none"?"auto":"none";
}

async function loadPDF(b64){
  try{
    var bin=atob(b64);
    pdfBuf=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) pdfBuf[i]=bin.charCodeAt(i);
    await openDoc();
  }catch(e){ showErr(String(e&&e.message||e)); }
}
function cancelPassword(){
  pwdCb=null;
  try{ if(loadTask) loadTask.destroy(); }catch(e){}
  showErr("Password required");
}
async function openDoc(){
  try{
    loadTask=pdfjsLib.getDocument({data:pdfBuf});
    loadTask.onPassword=function(cb,reason){
      pwdCb=cb;
      rn({type:"PASSWORD_REQUIRED", retry:reason===2});
    };
    pdfDoc=await loadTask.promise;
    numPages=pdfDoc.numPages;
    await measurePages();
    baseScale=(window.innerWidth-16)/pdfSize[1].w;
    layoutSlots();
    document.getElementById("scroll-wrap").style.display="block";
    setupScroll();
    rn({type:"SLOTS_READY"});
    rn({type:"SCALE", value:Math.round(userScale*100)});
    await new Promise(function(r){ setTimeout(r, 90); });
    await renderWindow();
    document.getElementById("loading").style.display="none";
    rn({type:"LOADED", pages:numPages});
    extractOutline();
    indexAll();
  }catch(e){
    if(e&&e.name==="PasswordException") return;
    showErr(String(e&&e.message||e));
  }
}
async function measurePages(){
  pdfSize={};
  for(var n=1;n<=numPages;n++){
    var page=await pdfDoc.getPage(n);
    var vp=page.getViewport({scale:1, rotation:pageRotation});
    pdfSize[n]={w:vp.width,h:vp.height};
    if(n%8===0) await yieldThread();
  }
}
function layoutSlots(){
  var root=document.getElementById("pages");
  if(!slotsReady){
    root.innerHTML="";
    for(var n=1;n<=numPages;n++){
      var slot=document.createElement("div");
      slot.className="page-slot";
      slot.id="pg"+n;
      slot.dataset.page=String(n);
      var label=document.createElement("div");
      label.className="pg-label";
      label.textContent=String(n);
      var wrap=document.createElement("div");
      wrap.className="page-wrap";
      var clip=document.createElement("div");
      clip.className="page-clip";
      wrap.appendChild(clip);
      slot.appendChild(label);
      slot.appendChild(wrap);
      root.appendChild(slot);
      setupLongPress(wrap,n);
    }
    slotsReady=true;
  }
  for(var i=1;i<=numPages;i++){
    applySlotBox(i);
    if(rendered[i]) unmountPage(i);
  }
  placeAllNotes();
}
function applySlotBox(n){
  var slot=document.getElementById("pg"+n);
  if(!slot) return;
  var size=cssSize(n);
  if(viewMode==="single") slot.style.height=document.getElementById("scroll-wrap").clientHeight+"px";
  else slot.style.height=(size.h+12)+"px";
  var wrap=slot.querySelector(".page-wrap");
  var clip=slot.querySelector(".page-clip");
  wrap.style.width=size.w+"px";
  wrap.style.height=size.h+"px";
  clip.style.width=size.w+"px";
  clip.style.height=size.h+"px";
}
function unmountPage(n){
  var slot=document.getElementById("pg"+n);
  if(!slot) return;
  var clip=slot.querySelector(".page-clip");
  clip.innerHTML="";
  slot.classList.remove("ready");
  delete pageVP[n];
  rendered[n]=false;
}
function visibleRange(){
  var sc=document.getElementById("scroll-wrap");
  var box=sc.getBoundingClientRect();
  var slots=document.querySelectorAll(".page-slot");
  var first=0,last=0;
  for(var i=0;i<slots.length;i++){
    var r=slots[i].getBoundingClientRect();
    if(r.bottom>=box.top-200 && r.top<=box.bottom+200){
      var n=parseInt(slots[i].dataset.page,10);
      if(!first) first=n;
      last=n;
    }
  }
  if(!first){ first=1; last=Math.min(2,numPages); }
  return { from:Math.max(1,first-1), to:Math.min(numPages,last+1) };
}
async function renderWindow(){
  if(windowRunning){ windowAgain=true; return; }
  windowRunning=true;
  try{
    do{
      windowAgain=false;
      await renderWindowOnce();
    } while(windowAgain);
  } finally { windowRunning=false; }
}
async function renderWindowOnce(){
  var token=layoutToken;
  var range=visibleRange();
  for(var n=1;n<=numPages;n++){
    if(rendered[n] && (n<range.from-2 || n>range.to+2)) unmountPage(n);
  }
  for(var p=range.from;p<=range.to;p++){
    if(token!==layoutToken) return;
    if(!rendered[p]) await renderPage(p, token);
  }
}
async function renderPage(n, token){
  if(rendered[n]||!pdfDoc) return;
  rendered[n]=true;
  var page=await pdfDoc.getPage(n);
  if(token!==layoutToken){ rendered[n]=false; return; }
  var size=cssSize(n);
  var dpr=Math.min(window.devicePixelRatio||1, 2);
  var unit=page.getViewport({scale:1, rotation:pageRotation});
  var vp=page.getViewport({scale:(size.w/unit.width)*dpr, rotation:pageRotation});
  pageVP[n]={vp:vp, dpr:dpr, cssW:size.w, cssH:size.h};
  var slot=document.getElementById("pg"+n);
  var clip=slot.querySelector(".page-clip");
  clip.innerHTML="";
  function canvas(className, w, h){
    var cv=document.createElement("canvas");
    cv.className=className;
    cv.width=w; cv.height=h;
    cv.style.width=size.w+"px";
    cv.style.height=size.h+"px";
    clip.appendChild(cv);
    return cv;
  }
  var pdfCv=canvas("pdf-cv", vp.width, vp.height);
  canvas("srch-cv", Math.round(size.w*dpr), Math.round(size.h*dpr));
  var ann=canvas("ann-cv", Math.round(size.w*dpr), Math.round(size.h*dpr));
  ann.style.pointerEvents=tool==="none"?"none":"auto";
  ann.style.touchAction=tool==="none"?"auto":"none";
  ann.style.cursor=CURSORS[tool]||"default";
  var fl=document.createElement("div");
  fl.className="form-layer";
  fl.style.width=size.w+"px";
  fl.style.height=size.h+"px";
  fl.style.pointerEvents=tool==="none"?"auto":"none";
  clip.appendChild(fl);
  var ctx=pdfCv.getContext("2d");
  ctx.filter="none";
  await page.render({canvasContext:ctx, viewport:vp}).promise;
  if(token!==layoutToken){ rendered[n]=false; return; }
  slot.classList.add("ready");
  paintMarkup(n);
  paintSearch(n);
  placeNotesForPage(n);
  renderForms(n, page, fl, vp, dpr, size.w, size.h);
  setupDraw(ann, n, slot.querySelector(".page-wrap"));
  ensurePageIndex(n);
}
async function applyDark(v){
  DARK=!!v;
  var bg=DARK?"#1C1C1E":"#E8E8E8";
  document.documentElement.style.background=bg;
  document.body.style.background=bg;
  var loading=document.getElementById("loading");
  if(loading) loading.style.background=bg;
}
async function setUserScale(v){
  var next=clampScale(v);
  if(Math.abs(next-userScale)<0.001){ reportScale(); return; }
  var sc=document.getElementById("scroll-wrap");
  var ratio=sc.scrollHeight?sc.scrollTop/sc.scrollHeight:0;
  userScale=next;
  layoutToken++;
  reportScale();
  layoutSlots();
  sc.scrollTop=ratio*sc.scrollHeight;
  await renderWindow();
}
async function fitPage(){
  if(!pdfSize[1]) return;
  var sw=(window.innerWidth-16)/pdfSize[1].w;
  var sh=(window.innerHeight-16)/pdfSize[1].h;
  await setUserScale(Math.min(sw,sh)/baseScale);
}
async function rotatePage(delta){
  pageRotation=((pageRotation+(delta||90))%360+360)%360;
  var sc=document.getElementById("scroll-wrap");
  var ratio=sc.scrollHeight?sc.scrollTop/sc.scrollHeight:0;
  layoutToken++;
  textIndex={};
  await measurePages();
  baseScale=(window.innerWidth-16)/pdfSize[1].w;
  layoutSlots();
  sc.scrollTop=ratio*(sc.scrollHeight||0);
  reportScale();
  await renderWindow();
  indexAll();
}
function setViewMode(mode){
  viewMode=mode==="single"?"single":"continuous";
  var sc=document.getElementById("scroll-wrap");
  if(viewMode==="single") sc.classList.add("single");
  else sc.classList.remove("single");
  for(var n=1;n<=numPages;n++) applySlotBox(n);
  renderWindow();
}
function goto(n){
  n=parseInt(n,10);
  if(!n||n<1||n>numPages) return;
  var el=document.getElementById("pg"+n);
  if(!el) return;
  el.scrollIntoView({behavior:"smooth", block:"start"});
  setTimeout(renderWindow, 60);
  setTimeout(renderWindow, 320);
}
function setupScroll(){
  var sc=document.getElementById("scroll-wrap");
  if(sc.dataset.bound) return;
  sc.dataset.bound="1";
  var last=1, raf=0;
  sc.addEventListener("scroll", function(){
    if(raf) return;
    raf=requestAnimationFrame(function(){
      raf=0;
      renderWindow();
      var mid=sc.getBoundingClientRect();
      var probe=mid.top+mid.height*0.35;
      var slots=document.querySelectorAll(".page-slot");
      var best=last, bestD=1e9;
      for(var i=0;i<slots.length;i++){
        var r=slots[i].getBoundingClientRect();
        var d=Math.abs((r.top+r.bottom)/2 - (mid.top+mid.height/2));
        if(d<bestD){ bestD=d; best=parseInt(slots[i].dataset.page,10); }
      }
      if(best!==last){ last=best; rn({type:"PAGE", page:best}); }
      probe=probe;
    });
  }, {passive:true});
}

function annCanvas(n){
  var slot=document.getElementById("pg"+n);
  return slot?slot.querySelector(".ann-cv"):null;
}
function paintMarkup(n){
  var cv=annCanvas(n);
  if(!cv) return;
  var ctx=cv.getContext("2d");
  ctx.clearRect(0,0,cv.width,cv.height);
  var src=legacy[n];
  if(src){
    var gen=layoutToken;
    var img=new Image();
    img.onload=function(){
      if(gen!==layoutToken) return;
      var live=annCanvas(n);
      if(!live) return;
      var c2=live.getContext("2d");
      c2.drawImage(img,0,0,live.width,live.height);
      paintOps(n,c2);
    };
    img.src=src;
    return;
  }
  paintOps(n,ctx);
}
function paintOps(n,ctx){
  var ops=markup[n]||[];
  var cv=ctx.canvas;
  for(var i=0;i<ops.length;i++) drawOp(n,ctx,ops[i],cv);
}
function drawOp(n,ctx,op,cv){
  ctx.save();
  ctx.lineCap="round";
  ctx.lineJoin="round";
  if(op.type==="stroke"){
    if(!op.points||op.points.length<2){ ctx.restore(); return; }
    ctx.beginPath();
    for(var i=0;i<op.points.length;i++){
      var p=pdfToCss(n,op.points[i].x,op.points[i].y);
      var x=p.x*(cv.width/pageVP[n].cssW), y=p.y*(cv.height/pageVP[n].cssH);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle=op.color;
    ctx.lineWidth=Math.max(1, cssLenToCanvas(n, cv, op.width));
    ctx.stroke();
  } else if(op.type==="highlight"||op.type==="underline"||op.type==="strike"){
    ctx.fillStyle=op.color;
    ctx.strokeStyle=op.color;
    var rects=op.rects||[];
    for(var r=0;r<rects.length;r++){
      var box=pdfRectCss(n,rects[r],cv);
      if(op.type==="highlight"){
        ctx.globalAlpha=0.38;
        ctx.fillRect(box.x,box.y,box.w,box.h);
      } else {
        ctx.globalAlpha=1;
        ctx.lineWidth=Math.max(1, 2*(cv.width/pageVP[n].cssW));
        ctx.beginPath();
        var y=op.type==="underline"?box.y+box.h:box.y+box.h*0.55;
        ctx.moveTo(box.x,y);
        ctx.lineTo(box.x+box.w,y);
        ctx.stroke();
      }
    }
  } else if(op.type==="shape"){
    strokeShape(n,ctx,cv,op,false);
  } else if(op.type==="stamp"){
    drawStamp(n,ctx,cv,op);
  } else if(op.type==="text"){
    var origin=pdfToCss(n,op.x,op.y);
    var sx=cv.width/pageVP[n].cssW, sy=cv.height/pageVP[n].cssH;
    var size=cssLenToCanvas(n,cv,op.size);
    ctx.fillStyle=op.color;
    ctx.font="bold "+size+"px Arial";
    ctx.textBaseline="alphabetic";
    ctx.fillText(op.text, origin.x*sx, origin.y*sy);
  }
  ctx.restore();
}
function cssLenToCanvas(n,cv,pdfLen){
  var a=pdfToCss(n,0,0);
  var b=pdfToCss(n,pdfLen,0);
  var c=pdfToCss(n,0,pdfLen);
  var css=Math.max(Math.abs(b.x-a.x), Math.abs(c.y-a.y));
  return css*(cv.width/pageVP[n].cssW);
}
function pdfRectCss(n,rect,cv){
  var a=pdfToCss(n,rect.x1,rect.y1);
  var b=pdfToCss(n,rect.x2,rect.y2);
  var sx=cv.width/pageVP[n].cssW, sy=cv.height/pageVP[n].cssH;
  var x1=a.x*sx, y1=a.y*sy, x2=b.x*sx, y2=b.y*sy;
  return { x:Math.min(x1,x2), y:Math.min(y1,y2), w:Math.abs(x2-x1), h:Math.abs(y2-y1) };
}
function strokeShape(n,ctx,cv,op,preview){
  var a=pdfToCss(n,op.x1,op.y1);
  var b=pdfToCss(n,op.x2,op.y2);
  var sx=cv.width/pageVP[n].cssW, sy=cv.height/pageVP[n].cssH;
  var x1=a.x*sx, y1=a.y*sy, x2=b.x*sx, y2=b.y*sy;
  ctx.strokeStyle=op.color;
  ctx.lineWidth=Math.max(1, 2.2*sx);
  ctx.globalAlpha=preview?0.7:1;
  ctx.beginPath();
  if(op.shape==="line"||op.shape==="arrow"){
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    if(op.shape==="arrow"){
      var dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy)||1;
      var ux=dx/len, uy=dy/len, ha=14*sx, hw=6*sx;
      ctx.beginPath();
      ctx.moveTo(x2,y2); ctx.lineTo(x2-ux*ha+uy*hw, y2-uy*ha-ux*hw);
      ctx.moveTo(x2,y2); ctx.lineTo(x2-ux*ha-uy*hw, y2-uy*ha+ux*hw);
      ctx.stroke();
    }
  } else if(op.shape==="rect"){
    ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
  } else {
    var rx=Math.max(Math.abs(x2-x1)/2,1), ry=Math.max(Math.abs(y2-y1)/2,1);
    ctx.ellipse((x1+x2)/2,(y1+y2)/2,rx,ry,0,0,Math.PI*2);
    ctx.stroke();
  }
}
function drawStamp(n,ctx,cv,op){
  var def=STAMPS[op.stamp]||STAMPS.draft;
  var a=pdfToCss(n, op.x-op.w/2, op.y-op.h/2);
  var b=pdfToCss(n, op.x+op.w/2, op.y+op.h/2);
  var sx=cv.width/pageVP[n].cssW, sy=cv.height/pageVP[n].cssH;
  var x=Math.min(a.x,b.x)*sx, y=Math.min(a.y,b.y)*sy;
  var w=Math.abs(b.x-a.x)*sx, h=Math.abs(b.y-a.y)*sy;
  ctx.globalAlpha=0.9;
  ctx.strokeStyle=def.color;
  ctx.lineWidth=Math.max(1,2*sx);
  ctx.strokeRect(x+2,y+2,Math.max(1,w-4),Math.max(1,h-4));
  ctx.fillStyle=def.color;
  var fs=Math.max(9, Math.min(h*0.42, 18));
  ctx.font="bold "+fs+"px Arial";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText(def.label, x+w/2, y+h/2);
  ctx.textAlign="start";
  ctx.textBaseline="alphabetic";
}
function pushUndo(n){
  globalUndoStack.push({page:n, ops:JSON.parse(JSON.stringify(markup[n]||[]))});
  if(globalUndoStack.length>MAX_UNDO) globalUndoStack.shift();
  rn({type:"UNDO_AVAILABLE", canUndo:true});
}
function sendMarkup(n){ rn({type:"MARKUP", page:n, ops:markup[n]||[]}); }
function undoLast(){
  if(!globalUndoStack.length){ rn({type:"UNDO_AVAILABLE", canUndo:false}); return; }
  var entry=globalUndoStack.pop();
  markup[entry.page]=entry.ops;
  paintMarkup(entry.page);
  sendMarkup(entry.page);
  rn({type:"UNDO_AVAILABLE", canUndo:globalUndoStack.length>0});
}
function commitOps(n,next){
  pushUndo(n);
  markup[n]=next;
  paintMarkup(n);
  sendMarkup(n);
}

function eventCss(cv,cx,cy){
  var r=cv.getBoundingClientRect();
  return { x:(cx-r.left)*(cv.dataset.cssW/r.width), y:(cy-r.top)*(cv.dataset.cssH/r.height) };
}
function setupDraw(cv,n,wrap){
  cv.dataset.cssW=String(pageVP[n].cssW);
  cv.dataset.cssH=String(pageVP[n].cssH);
  cv.dataset.page=String(n);
  var points=[];
  var drawing=false;
  var shapeStart=null;
  var snapStart=null;
  function onStart(cx,cy){
    clearSelection();
    if(tool==="none") return;
    var p=eventCss(cv,cx,cy);
    if(tool==="textbox"){ placeTextBox(n,p.x,p.y,wrap); return; }
    if(tool==="stamp"){ placeStamp(n,p.x,p.y); return; }
    if(tool==="highlight"||tool==="underline"||tool==="strikethrough"){
      snapStart=p; return;
    }
    if(tool==="shape"){ shapeStart=p; return; }
    drawing=true;
    points=[p];
  }
  function onMove(cx,cy){
    var p=eventCss(cv,cx,cy);
    if(snapStart){ showSnapRect(wrap,snapStart.x,snapStart.y,p.x,p.y); return; }
    if(shapeStart){
      paintMarkup(n);
      var ctx=cv.getContext("2d");
      var a=cssToPdf(n,shapeStart.x,shapeStart.y);
      var b=cssToPdf(n,p.x,p.y);
      strokeShape(n,ctx,cv,{type:"shape",shape:shapeType,color:drawColor,x1:a.x,y1:a.y,x2:b.x,y2:b.y},true);
      return;
    }
    if(!drawing) return;
    points.push(p);
    var ctx=cv.getContext("2d");
    var prev=points[points.length-2];
    ctx.save();
    if(tool==="eraser"){ ctx.globalCompositeOperation="destination-out"; ctx.strokeStyle="rgba(0,0,0,1)"; ctx.lineWidth=28*(cv.width/pageVP[n].cssW); }
    else { ctx.strokeStyle=drawColor; ctx.lineWidth=3*(cv.width/pageVP[n].cssW); }
    ctx.lineCap="round";
    ctx.beginPath();
    var p0=toCanvas(cv,n,prev);
    var p1=toCanvas(cv,n,p);
    ctx.moveTo(p0.x,p0.y);
    ctx.lineTo(p1.x,p1.y);
    ctx.stroke();
    ctx.restore();
  }
  function onEnd(cx,cy){
    if(snapStart){
      var pe=eventCss(cv,cx,cy);
      var start=snapStart;
      snapStart=null;
      removeSnapRect(wrap);
      enterSelection(n,cv,wrap,start,pe);
      return;
    }
    if(shapeStart){
      var end=eventCss(cv,cx,cy);
      var a=cssToPdf(n,shapeStart.x,shapeStart.y);
      var b=cssToPdf(n,end.x,end.y);
      shapeStart=null;
      if(Math.abs(end.x-a.x)+Math.abs(end.y) < 0) return;
      var dx=Math.abs(b.x-a.x), dy=Math.abs(b.y-a.y);
      if(dx+dy<1){ paintMarkup(n); return; }
      var ops=(markup[n]||[]).slice();
      ops.push({type:"shape", shape:shapeType, color:drawColor, x1:a.x, y1:a.y, x2:b.x, y2:b.y});
      commitOps(n, ops);
      return;
    }
    if(!drawing) return;
    drawing=false;
    var captured=points.slice();
    points=[];
    if(tool==="eraser"){
      var pdfPts=captured.map(function(pt){ return cssToPdf(n,pt.x,pt.y); });
      var pad=cssLenToPdf(n,18);
      var before=markup[n]||[];
      var next=before.filter(function(op){ return !hitByEraser(op,pdfPts,pad); });
      if(next.length===before.length){ paintMarkup(n); return; }
      commitOps(n, next);
      return;
    }
    if(captured.length<2){ paintMarkup(n); return; }
    var strokePts=captured.map(function(pt){ return cssToPdf(n,pt.x,pt.y); });
    var all=(markup[n]||[]).slice();
    all.push({type:"stroke", color:drawColor, width:cssLenToPdf(n, tool==="draw"?3:3), points:strokePts});
    commitOps(n, all);
  }
  cv.addEventListener("touchstart", function(e){
    if(tool==="none"||e.touches.length>=2) return;
    e.preventDefault();
    onStart(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:false});
  cv.addEventListener("touchmove", function(e){
    if(e.touches.length>=2) return;
    if(tool==="none") return;
    e.preventDefault();
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:false});
  cv.addEventListener("touchend", function(e){
    if(!e.changedTouches[0]) return;
    onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  });
  cv.addEventListener("mousedown", function(e){ if(tool==="none") return; e.preventDefault(); onStart(e.clientX,e.clientY); });
  cv.addEventListener("mousemove", function(e){ if(drawing||shapeStart||snapStart) onMove(e.clientX,e.clientY); });
  cv.addEventListener("mouseup", function(e){ if(drawing||shapeStart||snapStart) onEnd(e.clientX,e.clientY); });
  cv.addEventListener("mouseleave", function(e){ if(drawing||shapeStart||snapStart) onEnd(e.clientX,e.clientY); });
}
function toCanvas(cv,n,cssPt){
  return { x:cssPt.x*(cv.width/pageVP[n].cssW), y:cssPt.y*(cv.height/pageVP[n].cssH) };
}
function showSnapRect(wrap,x1,y1,x2,y2){
  var clip=wrap.querySelector(".page-clip");
  var el=clip.querySelector(".snap-rect");
  if(!el){ el=document.createElement("div"); el.className="snap-rect"; clip.appendChild(el); }
  el.style.left=Math.min(x1,x2)+"px";
  el.style.top=Math.min(y1,y2)+"px";
  el.style.width=Math.abs(x2-x1)+"px";
  el.style.height=Math.abs(y2-y1)+"px";
}
function removeSnapRect(wrap){
  var el=wrap.querySelector(".snap-rect");
  if(el) el.remove();
}
function itemsInCssRect(n,x1,y1,x2,y2){
  var items=textIndex[n]||[];
  var minX=Math.min(x1,x2)-4, maxX=Math.max(x1,x2)+4;
  var minY=Math.min(y1,y2)-6, maxY=Math.max(y1,y2)+6;
  var matched=[];
  for(var i=0;i<items.length;i++){
    var css=itemCss(n,items[i]);
    if(css.x<maxX && css.x+css.w>minX && css.y<maxY && css.y+css.h>minY) matched.push(items[i]);
  }
  return matched;
}
function itemCss(n,it){
  var a=pdfToCss(n,it.x,it.y);
  var b=pdfToCss(n,it.x+it.w,it.y+it.h);
  return { x:Math.min(a.x,b.x), y:Math.min(a.y,b.y), w:Math.abs(b.x-a.x), h:Math.abs(b.y-a.y) };
}
function enterSelection(n,cv,wrap,start,end){
  clearSelection();
  selection={n:n,cv:cv,wrap:wrap,x1:start.x,y1:start.y,x2:end.x,y2:end.y};
  drawSelectionPreview();
  var s=selection;
  var midY=(Math.min(s.y1,s.y2)+Math.max(s.y1,s.y2))/2;
  var tb=document.createElement("div");
  tb.className="sel-toolbar";
  tb.style.left=((s.x1+s.x2)/2)+"px";
  tb.style.top=Math.max(8, Math.min(s.y1,s.y2)-40)+"px";
  var apply=document.createElement("button");
  apply.className="sel-btn confirm";
  apply.textContent="Apply";
  var cancel=document.createElement("button");
  cancel.className="sel-btn cancel";
  cancel.textContent="Cancel";
  apply.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); confirmSelection(); });
  cancel.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); clearSelection(); paintMarkup(n); });
  tb.appendChild(apply);
  tb.appendChild(cancel);
  function handle(side,x,y){
    var h=document.createElement("div");
    h.className="sel-handle";
    h.style.left=x+"px";
    h.style.top=y+"px";
    h.addEventListener("mousedown", function(e){ e.stopPropagation(); selDrag={side:side, x:e.clientX, sel:side==="left"?selection.x1:selection.x2}; });
    h.addEventListener("touchstart", function(e){ e.stopPropagation(); e.preventDefault(); selDrag={side:side, x:e.touches[0].clientX, sel:side==="left"?selection.x1:selection.x2}; }, {passive:false});
    return h;
  }
  wrap.appendChild(handle("left", Math.min(s.x1,s.x2), midY));
  wrap.appendChild(handle("right", Math.max(s.x1,s.x2), midY));
  wrap.appendChild(tb);
}
function drawSelectionPreview(){
  if(!selection) return;
  var s=selection;
  paintMarkup(s.n);
  var ctx=s.cv.getContext("2d");
  var matched=itemsInCssRect(s.n,s.x1,s.y1,s.x2,s.y2);
  var kind=tool==="underline"?"underline":tool==="strikethrough"?"strike":"highlight";
  var rects=matched.length? matched.map(itemToRect) : [cssRectToPdf(s.n,s.x1,s.y1,s.x2,s.y2)];
  drawOp(s.n, ctx, {type:kind, color:drawColor, rects:rects}, s.cv);
}
function clearSelection(){
  if(!selection) return;
  var wrap=selection.wrap;
  selection=null;
  selDrag=null;
  var nodes=wrap.querySelectorAll(".sel-handle,.sel-toolbar,.snap-rect");
  for(var i=0;i<nodes.length;i++) nodes[i].remove();
}
function confirmSelection(){
  if(!selection) return;
  var s=selection;
  var n=s.n;
  var matched=itemsInCssRect(n,s.x1,s.y1,s.x2,s.y2);
  var kind=tool==="underline"?"underline":tool==="strikethrough"?"strike":"highlight";
  var rects=matched.length? mergeLineRects(matched) : [cssRectToPdf(n,s.x1,s.y1,s.x2,s.y2)];
  clearSelection();
  var ops=(markup[n]||[]).slice();
  ops.push({type:kind, color:drawColor, rects:rects});
  commitOps(n, ops);
}
function itemToRect(it){ return {x1:it.x, y1:it.y, x2:it.x+it.w, y2:it.y+it.h}; }
function cssRectToPdf(n,x1,y1,x2,y2){
  var a=cssToPdf(n,Math.min(x1,x2),Math.min(y1,y2));
  var b=cssToPdf(n,Math.max(x1,x2),Math.max(y1,y2));
  return {x1:a.x,y1:a.y,x2:b.x,y2:b.y};
}
function mergeLineRects(items){
  var sorted=items.slice().sort(function(a,b){ return b.y-a.y || a.x-b.x; });
  var lines=[];
  for(var i=0;i<sorted.length;i++){
    var it=sorted[i];
    var mid=it.y+it.h/2;
    var line=null;
    for(var j=0;j<lines.length;j++){
      if(Math.abs(lines[j].mid-mid)<it.h*0.7){ line=lines[j]; break; }
    }
    if(!line) lines.push({mid:mid, x1:it.x, y1:it.y, x2:it.x+it.w, y2:it.y+it.h});
    else {
      line.x1=Math.min(line.x1,it.x);
      line.y1=Math.min(line.y1,it.y);
      line.x2=Math.max(line.x2,it.x+it.w);
      line.y2=Math.max(line.y2,it.y+it.h);
      line.mid=(line.y1+line.y2)/2;
    }
  }
  return lines.map(function(ln){ return {x1:ln.x1,y1:ln.y1,x2:ln.x2,y2:ln.y2}; });
}
function hitByEraser(op,path,pad){
  if(op.type==="stroke"){
    var pts=op.points||[];
    for(var i=0;i<pts.length;i++) if(nearPath(path,pts[i].x,pts[i].y,pad)) return true;
    return false;
  }
  if(op.type==="highlight"||op.type==="underline"||op.type==="strike"){
    var rects=op.rects||[];
    for(var r=0;r<rects.length;r++){
      for(var p=0;p<path.length;p++) if(pointInRect(path[p].x,path[p].y,rects[r],pad)) return true;
    }
    return false;
  }
  if(op.type==="shape"){
    for(var s=0;s<path.length;s++){
      if(pointInRect(path[s].x,path[s].y,{x1:op.x1,y1:op.y1,x2:op.x2,y2:op.y2},pad)) return true;
    }
    return false;
  }
  if(op.type==="stamp"){
    return nearPath(path,op.x,op.y,Math.max(pad, op.w/2));
  }
  if(op.type==="text") return nearPath(path,op.x,op.y,pad*1.4);
  return false;
}
function nearPath(path,x,y,pad){
  var pad2=pad*pad;
  for(var i=0;i<path.length;i++){
    var dx=path[i].x-x, dy=path[i].y-y;
    if(dx*dx+dy*dy<=pad2) return true;
  }
  return false;
}
function pointInRect(x,y,rect,pad){
  var x1=Math.min(rect.x1,rect.x2)-pad, x2=Math.max(rect.x1,rect.x2)+pad;
  var y1=Math.min(rect.y1,rect.y2)-pad, y2=Math.max(rect.y1,rect.y2)+pad;
  return x>=x1&&x<=x2&&y>=y1&&y<=y2;
}
function placeStamp(n,cssX,cssY){
  var center=cssToPdf(n,cssX,cssY);
  var w=cssLenToPdf(n,148);
  var h=cssLenToPdf(n,42);
  var ops=(markup[n]||[]).slice();
  ops.push({type:"stamp", stamp:stampType, x:center.x, y:center.y, w:w, h:h});
  commitOps(n, ops);
}
function placeTextBox(n,cssX,cssY,wrap){
  var clip=wrap.querySelector(".page-clip");
  var ta=document.createElement("textarea");
  ta.className="txt-overlay";
  ta.style.left=cssX+"px";
  ta.style.top=cssY+"px";
  ta.placeholder="Type here";
  clip.appendChild(ta);
  setTimeout(function(){ ta.focus(); }, 40);
  var committed=false;
  function commit(){
    if(committed) return;
    committed=true;
    var text=ta.value.replace(/^\\s+|\\s+$/g,"");
    ta.remove();
    if(!text) return;
    var size=cssLenToPdf(n,14);
    var baseline=cssToPdf(n, cssX, cssY+14);
    var ops=(markup[n]||[]).slice();
    ops.push({type:"text", color:drawColor, x:baseline.x, y:baseline.y, size:size, text:text});
    commitOps(n, ops);
  }
  ta.addEventListener("blur", commit);
  ta.addEventListener("keydown", function(e){
    if(e.key==="Escape"){ committed=true; ta.remove(); }
    if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); commit(); }
  });
}

function setupLongPress(wrap,n){
  var timer=null, sx=0, sy=0, moved=false;
  function start(cx,cy){
    if(tool!=="none") return;
    moved=false;
    var rect=wrap.getBoundingClientRect();
    sx=cx; sy=cy;
    var localX=cx-rect.left, localY=cy-rect.top;
    timer=setTimeout(function(){
      timer=null;
      if(moved) return;
      suppressTap=true;
      var size=cssSize(n);
      var pdf=pageVP[n]?cssToPdf(n,localX,localY):{x:localX,y:localY};
      rn({type:"LONG_PRESS", page:n, x:localX/size.w, y:localY/size.h, pdfX:pdf.x, pdfY:pdf.y});
    }, 560);
  }
  function cancel(){ if(timer){ clearTimeout(timer); timer=null; } }
  wrap.addEventListener("touchstart", function(e){ if(e.touches.length!==1) return; start(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
  wrap.addEventListener("touchmove", function(){ moved=true; cancel(); }, {passive:true});
  wrap.addEventListener("touchend", cancel, {passive:true});
  wrap.addEventListener("touchcancel", cancel, {passive:true});
  wrap.addEventListener("mousedown", function(e){ start(e.clientX,e.clientY); });
  wrap.addEventListener("mousemove", function(e){ if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)>6){ moved=true; cancel(); } });
  wrap.addEventListener("mouseup", cancel);
  wrap.addEventListener("click", function(){
    if(suppressTap){ suppressTap=false; return; }
    if(tool==="none") rn({type:"TAP"});
  });
}

function loadNotes(list){
  notes={};
  var old=document.querySelectorAll(".note-pin");
  for(var i=0;i<old.length;i++) old[i].remove();
  for(var j=0;j<list.length;j++) addNote(list[j], true);
}
function addNote(note, silent){
  if(!note) return;
  notes[note.id]=note;
  renderNotePin(note);
}
function updateNote(id,color,text){
  if(!notes[id]) return;
  notes[id].color=color;
  notes[id].text=text;
  var pin=document.getElementById("np-"+id);
  if(pin) pin.style.background=color;
}
function deleteNote(id){
  delete notes[id];
  var pin=document.getElementById("np-"+id);
  if(pin) pin.remove();
}
function placeAllNotes(){
  var ids=Object.keys(notes);
  for(var i=0;i<ids.length;i++) renderNotePin(notes[ids[i]]);
}
function placeNotesForPage(n){
  var ids=Object.keys(notes);
  for(var i=0;i<ids.length;i++) if(notes[ids[i]].page===n) renderNotePin(notes[ids[i]]);
}
function renderNotePin(note){
  var slot=document.getElementById("pg"+note.page);
  if(!slot) return;
  var wrap=slot.querySelector(".page-wrap");
  var existing=document.getElementById("np-"+note.id);
  if(existing) existing.remove();
  var pin=document.createElement("div");
  pin.id="np-"+note.id;
  pin.className="note-pin";
  var pos;
  if(pageVP[note.page] && note.pdfX!=null && note.pdfY!=null) pos=pdfToCss(note.page, note.pdfX, note.pdfY);
  else {
    var size=cssSize(note.page);
    pos={x:(note.x||0)*size.w, y:(note.y||0)*size.h};
  }
  pin.style.left=pos.x+"px";
  pin.style.top=pos.y+"px";
  pin.style.background=note.color||"#FFEB3B";
  pin.textContent="\\u270E";
  pin.addEventListener("click", function(e){ e.stopPropagation(); suppressTap=true; rn({type:"NOTE_TAP", id:note.id}); });
  wrap.appendChild(pin);
}

function renderForms(n,page,fl,vp,dpr,cssW,cssH){
  page.getAnnotations({intent:"display"}).then(function(annots){
    for(var i=0;i<annots.length;i++){
      var annot=annots[i];
      if(annot.subtype!=="Widget"||!annot.rect) continue;
      var r=annot.rect;
      var p1=vp.convertToViewportPoint(r[0],r[1]);
      var p2=vp.convertToViewportPoint(r[2],r[3]);
      var left=Math.min(p1[0],p2[0])/dpr;
      var top=Math.min(p1[1],p2[1])/dpr;
      var width=Math.abs(p2[0]-p1[0])/dpr;
      var height=Math.abs(p2[1]-p1[1])/dpr;
      if(width<2||height<2) continue;
      var el;
      var ft=annot.fieldType;
      if(ft==="Btn"){
        el=document.createElement("input");
        el.type=annot.checkBox?"checkbox":annot.radioButton?"radio":"button";
        if(el.type==="button") continue;
      } else if(ft==="Ch"){
        el=document.createElement("select");
        var options=annot.options||[];
        for(var o=0;o<options.length;o++){
          var opt=document.createElement("option");
          opt.value=options[o].exportValue;
          opt.textContent=options[o].displayValue;
          el.appendChild(opt);
        }
      } else if(annot.multiLine){
        el=document.createElement("textarea");
      } else {
        el=document.createElement("input");
        el.type=annot.password?"password":"text";
        if(annot.maxLen) el.maxLength=annot.maxLen;
        if(annot.readOnly) el.readOnly=true;
      }
      var key=annot.fieldName||("p"+n+"_"+Math.round(left)+"_"+Math.round(top));
      el.dataset.field=key;
      el.className="form-field";
      el.style.left=left+"px";
      el.style.top=top+"px";
      el.style.width=width+"px";
      el.style.height=height+"px";
      el.style.fontSize=Math.max(8, Math.min(height*0.65, 14))+"px";
      var stored=formState.hasOwnProperty(key)?formState[key]:null;
      if(el.type==="checkbox"||el.type==="radio"){
        var initial=stored!=null?stored:String(annot.fieldValue||"");
        el.checked=!!initial && initial!=="Off" && initial!=="false";
        el.value=annot.buttonValue||annot.exportValue||"Yes";
      } else {
        el.value=stored!=null?stored:String(annot.fieldValue||"");
      }
      (function(field,node){
        function emit(){
          var value=(node.type==="checkbox"||node.type==="radio") ? (node.checked?node.value||"Yes":"Off") : node.value;
          formState[field]=value;
          rn({type:"FORM", name:field, value:value});
        }
        node.addEventListener("change", emit);
        node.addEventListener("input", function(){
          var value=(node.type==="checkbox"||node.type==="radio") ? (node.checked?node.value||"Yes":"Off") : node.value;
          formState[field]=value;
          clearTimeout(node._saveTimer);
          node._saveTimer=setTimeout(function(){ rn({type:"FORM", name:field, value:formState[field]}); }, 280);
        });
      })(key, el);
      fl.appendChild(el);
    }
  }).catch(function(){});
}

var indexGen=0;
function ensurePageIndex(n){
  if(textIndex[n]||!pdfDoc) return;
  pdfDoc.getPage(n).then(function(page){
    return page.getTextContent({normalizeWhitespace:true});
  }).then(function(tc){
    if(!textIndex[n]) textIndex[n]=boxesFromItems(tc.items||[]);
  }).catch(function(){ if(!textIndex[n]) textIndex[n]=[]; });
}
async function indexAll(){
  var gen=++indexGen;
  var token=layoutToken;
  for(var n=1;n<=numPages;n++){
    if(gen!==indexGen||token!==layoutToken) return;
    if(!textIndex[n]){
      var page=await pdfDoc.getPage(n);
      var tc=await page.getTextContent({normalizeWhitespace:true});
      if(!textIndex[n]) textIndex[n]=boxesFromItems(tc.items||[]);
    }
    if(n%6===0) await yieldThread();
  }
}
function boxesFromItems(items){
  var out=[];
  for(var i=0;i<items.length;i++){
    var item=items[i];
    if(!item.str||!String(item.str).trim()||!item.transform) continue;
    var t=item.transform;
    var adv=Math.abs(item.width* (t[0]||1));
    var h=Math.abs(t[3])||Math.sqrt((t[2]||0)*(t[2]||0)+(t[3]||0)*(t[3]||0))||8;
    var str=String(item.str);
    var total=str.length||1;
    var offset=0;
    var parts=str.split(/(\\s+)/);
    for(var p=0;p<parts.length;p++){
      var tok=parts[p];
      if(!tok) continue;
      if(!String(tok).trim()){ offset+=tok.length; continue; }
      var start=offset/total;
      var frac=tok.length/total;
      out.push({
        str:tok,
        x:t[4]+start*adv,
        y:t[5]-h*0.25,
        w:Math.max(frac*adv,1),
        h:h*1.2
      });
      offset+=tok.length;
    }
  }
  return out;
}

async function doSearch(query){
  clearSearch();
  if(!pdfDoc||!query||!String(query).trim()){ rn({type:"SEARCH_DONE", results:[], total:0}); return; }
  await indexAll();
  var results=[];
  for(var n=1;n<=numPages;n++){
    var matched=findTextMatches(textIndex[n]||[], query);
    if(!matched.length) continue;
    var rects=[];
    for(var i=0;i<matched.length;i++) rects.push(itemToRect(matched[i]));
    searchHits[n]=rects;
    results.push({page:n, count:matched.length});
    var slot=document.getElementById("pg"+n);
    if(slot) slot.querySelector(".page-wrap").classList.add("search-match");
    paintSearch(n);
  }
  rn({type:"SEARCH_DONE", results:results, total:results.length});
  if(results.length) goto(results[0].page);
}
function paintSearch(n){
  var slot=document.getElementById("pg"+n);
  if(!slot||!pageVP[n]) return;
  var cv=slot.querySelector(".srch-cv");
  if(!cv) return;
  var ctx=cv.getContext("2d");
  ctx.clearRect(0,0,cv.width,cv.height);
  var rects=searchHits[n];
  if(!rects) return;
  ctx.fillStyle="rgba(251,191,36,.38)";
  for(var i=0;i<rects.length;i++){
    var box=pdfRectCss(n,rects[i],cv);
    ctx.fillRect(box.x,box.y,box.w,box.h);
  }
}
function clearSearch(){
  searchHits={};
  var marks=document.querySelectorAll(".search-match");
  for(var i=0;i<marks.length;i++) marks[i].classList.remove("search-match");
  var canvases=document.querySelectorAll(".srch-cv");
  for(var c=0;c<canvases.length;c++){
    var ctx=canvases[c].getContext("2d");
    ctx.clearRect(0,0,canvases[c].width,canvases[c].height);
  }
}
function gotoResult(idx){
  var pages=Object.keys(searchHits).map(function(p){ return parseInt(p,10); }).sort(function(a,b){ return a-b; });
  if(idx<0||idx>=pages.length) return;
  goto(pages[idx]);
}

async function extractOutline(){
  try{
    var outline=await pdfDoc.getOutline();
    if(!outline||!outline.length){ rn({type:"OUTLINE", items:[]}); return; }
    var flat=await flattenOutline(outline,0);
    rn({type:"OUTLINE", items:flat});
  }catch(e){ rn({type:"OUTLINE", items:[]}); }
}
async function flattenOutline(items,depth){
  var result=[];
  for(var i=0;i<items.length;i++){
    var item=items[i];
    var page=0;
    try{
      var dest=item.dest;
      if(typeof dest==="string") dest=await pdfDoc.getDestination(dest);
      if(dest&&dest[0]) page=(await pdfDoc.getPageIndex(dest[0]))+1;
    }catch(e){}
    result.push({title:item.title||"", page:page, depth:depth});
    if(item.items&&item.items.length){
      var kids=await flattenOutline(item.items, depth+1);
      for(var k=0;k<kids.length;k++) result.push(kids[k]);
    }
  }
  return result;
}
function startThumbs(){
  if(thumbsStarted||!pdfDoc) return;
  thumbsStarted=true;
  var n=1;
  function step(){
    if(n>numPages) return;
    var pageNo=n++;
    renderThumb(pageNo).then(function(){ setTimeout(step, 24); }, function(){ setTimeout(step, 24); });
  }
  step();
}
async function renderThumb(n){
  var page=await pdfDoc.getPage(n);
  var vp0=page.getViewport({scale:1, rotation:pageRotation});
  var vp=page.getViewport({scale:68/vp0.width, rotation:pageRotation});
  var cv=document.createElement("canvas");
  cv.width=Math.max(1,Math.round(vp.width));
  cv.height=Math.max(1,Math.round(vp.height));
  await page.render({canvasContext:cv.getContext("2d"), viewport:vp}).promise;
  rn({type:"THUMB", page:n, data:cv.toDataURL("image/jpeg", 0.55), w:cv.width, h:cv.height});
}

var pinch=null, previewScale=null;
function touchDist(e){
  var dx=e.touches[0].clientX-e.touches[1].clientX;
  var dy=e.touches[0].clientY-e.touches[1].clientY;
  return Math.sqrt(dx*dx+dy*dy);
}
document.addEventListener("touchstart", function(e){
  if(e.touches.length<2) return;
  pinch={dist:touchDist(e), scale:userScale};
}, {passive:true});
document.addEventListener("touchmove", function(e){
  if(selDrag&&selection&&e.touches.length===1){
    e.preventDefault();
    var dx=e.touches[0].clientX-selDrag.x;
    var cv=selection.cv;
    var r=cv.getBoundingClientRect();
    var cssPer=pageVP[selection.n].cssW/r.width;
    var next=selDrag.sel+dx*cssPer;
    if(selDrag.side==="left") selection.x1=Math.min(next, selection.x2-8);
    else selection.x2=Math.max(next, selection.x1+8);
    drawSelectionPreview();
    return;
  }
  if(e.touches.length<2||!pinch) return;
  e.preventDefault();
  previewScale=clampScale(pinch.scale*(touchDist(e)/pinch.dist));
  var pages=document.getElementById("pages");
  pages.style.transformOrigin="top center";
  pages.style.transform="scale("+(previewScale/userScale)+")";
  rn({type:"SCALE", value:Math.round(previewScale*100)});
}, {passive:false});
document.addEventListener("touchend", function(e){
  if(pinch&&e.touches.length<2){
    var next=previewScale;
    pinch=null;
    previewScale=null;
    document.getElementById("pages").style.transform="";
    if(next && Math.abs(next-userScale)>0.02) setUserScale(next);
  }
}, {passive:true});
document.addEventListener("mousemove", function(e){
  if(!selDrag||!selection) return;
  var dx=e.clientX-selDrag.x;
  var r=selection.cv.getBoundingClientRect();
  var cssPer=pageVP[selection.n].cssW/r.width;
  var next=selDrag.sel+dx*cssPer;
  if(selDrag.side==="left") selection.x1=Math.min(next, selection.x2-8);
  else selection.x2=Math.max(next, selection.x1+8);
  drawSelectionPreview();
});
document.addEventListener("mouseup", function(){ selDrag=null; });

rn({type:"READY"});
</script>
</body>
</html>`;
}
