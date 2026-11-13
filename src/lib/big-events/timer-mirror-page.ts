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
#app{position:fixed;inset:0;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:3vw;padding:3vh 3vw 0}
.lbl{font-size:clamp(14px,2.6vw,34px);font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:${css(c.muted)}}
.item{font-size:clamp(14px,2.4vw,30px);color:${css(c.muted)};margin-top:.4vh}
.spk{font-size:clamp(16px,3vw,40px);font-weight:500;margin-top:.6vh}
.pill{white-space:nowrap;font-size:clamp(13px,2vw,26px);font-weight:600;border-radius:999px;padding:.6vh 1.6vw;border:1px solid ${css(c.border)}}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0}
.clk{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-weight:600;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;font-size:min(30vw,52vh)}
.clk.long{font-size:min(20vw,40vh)}
.over{border:3px solid ${css(c.danger)};color:${css(c.danger)};border-radius:20px;padding:1.5vh 4vw;margin-bottom:3vh;font-weight:800;text-transform:uppercase;font-size:clamp(20px,4.5vw,64px)}
.idle{text-align:center;padding:0 5vw}.idle .t{font-size:clamp(20px,4.5vw,60px);font-weight:600}.idle .s{font-size:clamp(14px,2.4vw,30px);color:${css(c.muted)};margin-bottom:1.5vh}
footer{display:flex;justify-content:space-between;gap:3vw;border-top:2px solid ${css(c.border)};padding:2.5vh 3vw calc(2.5vh + env(safe-area-inset-bottom));font-size:clamp(16px,2.8vw,40px);color:${css(c.muted)}}
footer b{color:${css(c.fg)}}
.ok{color:${css(c.ok)}}.warn{color:${css(c.warn)}}.danger,.overc{color:${css(c.danger)}}.idlec{color:${css(c.fg)}}
.hint{position:fixed;bottom:1vh;left:0;right:0;text-align:center;font-size:12px;color:${css(c.muted)};opacity:.6}
</style></head><body><div id="app"></div><div class="hint" id="hint"></div>
<script>
var T=${json(text)};var C=${json({ ok: c.ok, warn: c.warn, danger: c.danger, muted: c.muted })};
${LOCAL_LOGIC_JS}
var snap=null,base=0,recv=0,lastOk=0;
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[ch];});}
function poll(){var x=new XMLHttpRequest();x.open("GET","/state?t="+Date.now(),true);x.timeout=4000;
x.onload=function(){try{var r=JSON.parse(x.responseText);lastOk=Date.now();if(r&&r.snap&&r.snap.v===1){snap=r.snap;recv=Date.now();base=snap.live?snap.live.elapsedMs+(snap.live.paused?0:Math.max(0,r.serverNow-snap.sentAt)):0;}else{snap=null;}}catch(e){}};
x.send();}
function render(){var now=Date.now(),sig=now-lastOk<6000,h="";
if(!snap){h='<main><div class="idle"><div class="s">'+esc(sig?T.waiting:T.noSignal)+'</div></div></main>';}
else if(!snap.live){h='<header><div></div><span class="pill" style="color:'+C.muted+'">'+esc(sig?T.live:T.noSignal)+'</span></header><main><div class="idle">'+(snap.next?'<div class="s">'+esc(T.nextPart)+'</div><div class="t">'+esc(snap.next.time)+' \\u2022 '+esc(snap.next.title)+'</div>':'<div class="t">'+esc(snap.event)+'</div>')+'</div></main>';}
else{var l=snap.live,el=base+(l.paused?0:now-recv),tn=tone(l.plannedMs,el),txt=clock(snap.mode,l.plannedMs,el);
var head=(l.label?esc(l.label)+' \\u2022 ':'')+esc(l.title)+(l.minutes!=null?' ('+l.minutes+' min)':'')+(l.pos?' ('+esc(T.partOf.replace("{i}",l.pos.i).replace("{n}",l.pos.n))+')':'');
var st=!sig?'<span class="pill" style="color:'+C.muted+'">'+esc(T.noSignal)+'</span>':l.paused?'<span class="pill" style="color:'+C.warn+'">\\u23F8 '+esc(T.paused)+'</span>':'<span class="pill" style="color:'+C.ok+'">\\u25CF '+esc(T.live)+'</span>';
h='<header><div style="min-width:0"><div class="lbl">'+head+'</div>'+(l.item?'<div class="item">\\u2022 '+esc(l.item)+'</div>':'')+(l.speaker?'<div class="spk">'+esc(T.speaker)+' '+esc(l.speaker)+'</div>':'')+'</div>'+st+'</header>';
h+='<main>'+(tn==="over"?'<div class="over">\\u26A0 '+esc(T.over)+'</div>':'')+'<div class="clk '+(tn==="over"?"overc":tn==="idle"?"idlec":tn)+(txt.length>6?' long':'')+'">'+esc(txt)+'</div></main>';
if(l.endLabel||l.nextSpeaker)h+='<footer><span>'+(l.endLabel?esc(T.end)+' <b>'+esc(l.endLabel)+'</b>':'')+'</span><span>'+(l.nextSpeaker?esc(T.nextSpeaker)+' <b>'+esc(l.nextSpeaker)+'</b>':'')+'</span></footer>';}
var a=document.getElementById("app");if(a.innerHTML!==h)a.innerHTML=h;}
document.getElementById("hint").textContent=T.tapFull;
document.body.onclick=function(){var d=document.documentElement,f=d.requestFullscreen||d.webkitRequestFullscreen;if(f)try{f.call(d);}catch(e){}document.getElementById("hint").style.display="none";};
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
