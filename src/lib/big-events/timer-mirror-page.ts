// Página do relógio servida pelo celular do superintendente na rede local (sem internet).
// Precisa abrir em qualquer navegador de tablet, inclusive antigo: HTML único, JS simples (ES5),
// cores lidas dos tokens do app e convertidas para rgb no momento em que o servidor liga.

/** Mesmas regras de mirrorTone/mirrorClock (timer-mirror.ts), em ES5 para navegadores antigos. */
export const LOCAL_LOGIC_JS = `
function pad(n){return (n<10?"0":"")+n;}
function mmss(ms){var t=Math.floor(Math.abs(ms)/1000),h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;return h?h+":"+pad(m)+":"+pad(s):pad(m)+":"+pad(s);}
function tone(planned,elapsed){if(planned==null)return "idle";var left=planned-elapsed;if(left<0)return "over";if(left<=60000)return "danger";if(left<=120000)return "warn";return "ok";}
function clock(mode,planned,elapsed){if(mode==="up"||planned==null)return mmss(elapsed);var left=planned-elapsed;return (left<0&&Math.floor(-left/1000)>=1)?"+"+mmss(-left):mmss(Math.max(0,left));}
`;

export interface LocalPageText {
  title: string; live: string; paused: string; noSignal: string; speaker: string; end: string; nextSpeaker: string;
  over: string; nextPart: string; waiting: string; tapFull: string; partOf: string;
}
export interface LocalPageColors { bg: string; fg: string; muted: string; ok: string; warn: string; danger: string; border: string }

const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
const css = (s: string) => s.replace(/[^#a-zA-Z0-9(),.%\s/-]/g, "");

export function localMirrorHtml(text: LocalPageText, c: LocalPageColors): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><title>${text.title.replace(/[<>&]/g, "")}</title>
<style>
html,body{margin:0;height:100%;background:${css(c.bg)};color:${css(c.fg)};font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-user-select:none;user-select:none;overflow:hidden}
#app{position:fixed;inset:0;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;box-sizing:border-box;padding:max(3vh,env(safe-area-inset-top)) 4vw max(3vh,env(safe-area-inset-bottom))}
.land #app{padding-top:max(2.5vh,env(safe-area-inset-top));padding-bottom:max(2.5vh,env(safe-area-inset-bottom))}
.fit{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
html:not(.land) header{align-items:flex-start}
html:not(.land) #f2{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.35}
html:not(.land) .lbl.fit{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-height:1.35}
header{display:flex;align-items:center;gap:3vw}
.lbl{flex:1;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:${css(c.muted)}}
.spk{font-weight:500;margin-top:1vh}
.pill{white-space:nowrap;font-size:clamp(11px,min(2.4vw,3.6vh),22px);font-weight:600;border-radius:999px;padding:.25em .8em;border:1px solid ${css(c.border)}}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0;padding:3vh 0}
.land main{padding:1.5vh 0}
#box{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.clk{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-weight:600;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap}
.over{border:2px solid ${css(c.danger)};color:${css(c.danger)};border-radius:999px;padding:.3em 1em;margin-bottom:1.5vh;font-weight:800;text-transform:uppercase;font-size:clamp(15px,min(5vw,6.5vh),52px)}
.idle{text-align:center;padding:0 5vw;margin:auto}.idle .t{font-size:clamp(20px,min(6vw,8vh),60px);font-weight:600}.idle .s{font-size:clamp(14px,min(3.6vw,5vh),30px);color:${css(c.muted)};margin-bottom:1.5vh}
footer{border-top:1px solid ${css(c.border)};padding-top:1.6vh;color:${css(c.muted)}}
footer .fit+.fit{margin-top:.6vh}
footer b{color:${css(c.fg)};font-weight:600}.sep{padding:0 .7em;color:${css(c.border)}}
.ok{color:${css(c.ok)}}.warn{color:${css(c.warn)}}.danger,.overc{color:${css(c.danger)}}.idlec{color:${css(c.fg)}}
.hint{position:fixed;top:max(1.5vh,env(safe-area-inset-top));left:50%;transform:translateX(-50%);-webkit-transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:500;color:${css(c.muted)};background:${css(c.bg)};border:1px solid ${css(c.border)};border-radius:999px;padding:6px 14px;pointer-events:none}
</style></head><body><div id="app"></div><div class="hint" id="hint"></div>
<script>
var T=${json(text)};var C=${json({ ok: c.ok, warn: c.warn, danger: c.danger, muted: c.muted })};
${LOCAL_LOGIC_JS}
var snap=null,base=0,recv=0,lastOk=0;
var KEY="visitasc.mirror.last";function keep(){try{localStorage.setItem(KEY,JSON.stringify({s:snap,b:base,r:recv}));}catch(e){}}
(function(){try{var o=JSON.parse(localStorage.getItem(KEY)||"null");if(o&&o.s&&o.s.v===1&&Date.now()-o.r<21600000){snap=o.s;base=o.b;recv=o.r;}}catch(e){}})();
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[ch];});}
function poll(){var x=new XMLHttpRequest();x.open("GET","/state?t="+Date.now(),true);x.timeout=4000;
x.onload=function(){try{var r=JSON.parse(x.responseText);lastOk=Date.now();if(r&&r.snap&&r.snap.v===1){snap=r.snap;recv=Date.now();base=snap.live?snap.live.elapsedMs+(snap.live.paused?0:Math.max(0,r.serverNow-snap.sentAt)):0;keep();}else if(!(snap&&snap.live)){snap=null;}}catch(e){}};
x.send();}
function fitLine(el,max,min){if(!el)return;el.style.fontSize=max+"px";if(el.scrollWidth<=el.clientWidth+1)return;var lo=Math.min(min,max),hi=max;while(hi-lo>0.5){var m=(lo+hi)/2;el.style.fontSize=m+"px";if(el.scrollWidth<=el.clientWidth+1)lo=m;else hi=m;}el.style.fontSize=lo+"px";}
function fitClock(){var b=document.getElementById("box"),el=document.getElementById("clk");if(!b||!el)return;var W=b.clientWidth*0.96,H=b.clientHeight,lo=16,hi=Math.max(16,H);el.style.fontSize=hi+"px";if(el.offsetWidth<=W&&el.offsetHeight<=H)return;while(hi-lo>1){var m=(lo+hi)/2;el.style.fontSize=m+"px";if(el.offsetWidth<=W&&el.offsetHeight<=H)lo=m;else hi=m;}el.style.fontSize=lo+"px";}
var lastFrame="",lastShape="";
function withCong(n,c){return n?(c?n+" \\u00B7 "+c:n):(c||"");}
function render(){var now=Date.now(),sig=now-lastOk<6000,pre="",post="",ck=null,w=window.innerWidth,hh=window.innerHeight,land=w>hh;
document.documentElement.className=land?"land":"";
if(!snap){pre='<div class="idle"><div class="s">'+esc(sig?T.waiting:T.noSignal)+'</div></div>';}
else if(!snap.live){pre='<header><div style="flex:1"></div><span class="pill" style="color:'+C.muted+'">'+esc(sig?T.live:T.noSignal)+'</span></header><div class="idle">'+(snap.next?'<div class="s">'+esc(T.nextPart)+'</div><div class="t">'+esc(snap.next.time)+' \\u2022 '+esc(snap.next.title)+'</div>':'<div class="t">'+esc(snap.event)+'</div>')+'</div>';}
else{var l=snap.live,el=base+(l.paused?0:now-recv),tn=tone(l.plannedMs,el),txt=clock(snap.mode,l.plannedMs,el);
var parts=[];if(l.label)parts.push(l.label);parts.push(l.item||l.title);
var head=esc(parts.join(" \\u2022 "))+(l.pos?' ('+esc(T.partOf.replace("{i}",l.pos.i).replace("{n}",l.pos.n))+')':'')+(l.minutes!=null?' ('+l.minutes+' min)':'');
var who=withCong(l.speaker,l.speakerCong),nx=withCong(l.nextSpeaker,l.nextCong);
var st=!sig?'<span class="pill" style="color:'+C.muted+'">'+esc(T.noSignal)+'</span>':l.paused?'<span class="pill" style="color:'+C.warn+'">\\u23F8 '+esc(T.paused)+'</span>':'<span class="pill" style="color:'+C.ok+'">\\u25CF '+esc(T.live)+'</span>';
ck={cls:"clk "+(tn==="over"?"overc":tn==="idle"?"idlec":tn),txt:txt};
pre='<header><div class="lbl fit" id="l1">'+head+'</div>'+st+'</header>'+(who?'<div class="spk fit" id="l2">'+esc(who)+'</div>':'')+'<main>'+(tn==="over"?'<div class="over">\\u26A0 '+esc(T.over)+'</div>':'')+'<div id="box">';
var endH=l.endLabel?esc(T.end)+' <b>'+esc(l.endLabel)+'</b>':'',nxH=nx?esc(T.nextSpeaker)+' <b>'+esc(nx)+'</b>':'';
post='</div></main>'+((endH||nxH)?'<footer>'+(land?'<div class="fit" id="f1">'+endH+(endH&&nxH?'<span class="sep">|</span>':'')+nxH+'</div>':(endH?'<div class="fit" id="f1">'+endH+'</div>':'')+(nxH?'<div class="fit" id="f2">'+nxH+'</div>':''))+'</footer>':'');}
var frame=pre+"#"+post+"#"+w+"x"+hh+(ck?ck.cls:""),a=document.getElementById("app");
if(frame!==lastFrame){lastFrame=frame;lastShape="";
a.innerHTML=pre+(ck?'<div id="clk" class="'+ck.cls+'"></div>':'')+post;
var px=function(vw,vh,cap){return Math.min(w*vw,hh*vh,cap);};
var S=land?{h:px(.03,.062,40),w:px(.034,.072,44),f:px(.028,.058,36)}:{h:px(.04,.024,30),w:px(.05,.03,38),f:px(.042,.026,30)};
if(land)fitLine(document.getElementById("l1"),S.h,11);else{var e1=document.getElementById("l1");if(e1)e1.style.fontSize=Math.max(13,S.h)+"px";}fitLine(document.getElementById("l2"),S.w,12);if(land)fitLine(document.getElementById("f1"),S.f,11);else{var ff=[document.getElementById("f1"),document.getElementById("f2")];for(var fi=0;fi<2;fi++)if(ff[fi])ff[fi].style.fontSize=Math.max(13,S.f)+"px";}}
if(ck){var c=document.getElementById("clk");if(c.textContent!==ck.txt)c.textContent=ck.txt;var shape=ck.txt.replace(/[0-9]/g,"0");if(shape!==lastShape){lastShape=shape;fitClock();}}}
window.onresize=function(){lastFrame="";render();};

document.getElementById("hint").textContent=T.tapFull;
function full(){var d=document.documentElement,f=d.requestFullscreen||d.webkitRequestFullscreen;if(f&&!document.fullscreenElement&&!document.webkitFullscreenElement){try{var r=f.call(d);if(r&&r.then)r.then(function(){document.getElementById("hint").style.display="none";},function(){});}catch(e){}}}
function first(){full();document.getElementById("hint").style.display="none";}
document.addEventListener("touchstart",first,false);document.addEventListener("mousedown",first,false);document.addEventListener("keydown",first,false);
document.addEventListener("fullscreenchange",function(){document.getElementById("hint").style.display=document.fullscreenElement?"none":"";},false);
if(!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen))document.getElementById("hint").style.display="none";
full();
function lock(){try{if(navigator.wakeLock)navigator.wakeLock.request("screen").catch(function(){});}catch(e){}}
document.addEventListener("visibilitychange",function(){if(!document.hidden)lock();});lock();
poll();setInterval(poll,1000);setInterval(render,250);render();
</script></body></html>`;
}

/** Converte um token de cor do app (oklch etc.) em rgb() — tablets antigos não entendem oklch. */
function toRgb(value: string, fallback: string): string {
  try {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx || !value) return fallback;
    ctx.fillStyle = fallback; ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return a >= 250 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
  } catch { return fallback; }
}
/** Lê as cores do tema escuro do app no momento em que o servidor local liga. */
export function darkTokenColors(): LocalPageColors {
  const fb: LocalPageColors = { bg: "rgb(10,12,22)", fg: "rgb(248,249,252)", muted: "rgb(170,178,196)", ok: "rgb(40,170,110)", warn: "rgb(235,180,40)", danger: "rgb(220,60,50)", border: "rgba(255,255,255,0.16)" };
  if (typeof document === "undefined") return fb;
  const el = document.createElement("div"); el.className = "dark"; el.style.display = "none"; document.body.appendChild(el);
  const cs = getComputedStyle(el); const v = (n: string) => cs.getPropertyValue(n).trim();
  const out: LocalPageColors = {
    bg: toRgb(v("--background"), fb.bg), fg: toRgb(v("--foreground"), fb.fg), muted: toRgb(v("--muted-foreground"), fb.muted),
    ok: toRgb(v("--success"), fb.ok), warn: toRgb(v("--warning"), fb.warn), danger: toRgb(v("--destructive"), fb.danger), border: toRgb(v("--border"), fb.border),
  };
  el.remove();
  return out;
}
