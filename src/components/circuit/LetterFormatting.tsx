// Ferramentas manuais da carta convite: barra de formatação por caixa, layout da página e contador de páginas.
import { useEffect, useRef, useState } from "react";
import { Bold, FileText, Highlighter, Italic, List, Minus, MoveVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  BOX_SIZE_LIMITS, DEFAULT_MANUAL_LAYOUT, LAYOUT_LIMITS, boxStyleOf, buildLetterModel, sanitizeLayout,
  type LetterBoxKey, type LetterLayout, type LetterModel, type LetterTemplate,
} from "@/lib/big-events/letter-template";
import { toggleBullets, toggleWrap } from "@/lib/big-events/letter-markup";

/** Carta de exemplo usada na Prévia e no contador de páginas. */
export function sampleLetterModel(t: LetterTemplate): LetterModel {
  return buildLetterModel(t, { name: "Assembleia de circuito", event_date: new Date().toISOString().slice(0, 10), location: "Salão de Assembleias", extra_info: null, public_token: "exemplo", public_code: "exemplo1", link_mode: "pin" },
    { id: "x", sort_order: 0, part_time: "09:40", duration_min: 15, theme: "Tema de exemplo", outline_number: "7", instructions: null, part_type_label: "Discurso", assigned_to: "speaker", speaker_name: "Nome do orador", speaker_congregation: "Congregação", show_next_speaker: false },
    [], "123456");
}

/** Contador ao vivo: refaz a carta de exemplo ~0,8 s depois da última mudança. */
export function PageCounter({ tpl }: { tpl: LetterTemplate }) {
  const [res, setRes] = useState<{ pages: number; level: number } | null>(null);
  useEffect(() => {
    let alive = true;
    const id = setTimeout(async () => {
      try {
        const { letterPdfFit } = await import("@/lib/big-events/letter-render");
        const r = await letterPdfFit(sampleLetterModel(tpl));
        if (alive) setRes({ pages: r.pages, level: r.level });
      } catch { /* prévia indisponível */ }
    }, 800);
    return () => { alive = false; clearTimeout(id); };
  }, [tpl]);
  const ok = res?.pages === 1;
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border p-3", res && (ok ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/10"))} aria-live="polite">
      <FileText className={cn("h-5 w-5 shrink-0", res ? (ok ? "text-success" : "text-warning") : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{!res ? "Contando páginas…" : ok ? "1 página ✓" : `${res.pages} páginas ⚠`}</p>
        <p className="text-xs text-muted-foreground">
          {!res ? "Carta de exemplo" : res.level === 0 ? "Layout manual" : `Ajuste automático: nível ${res.level} de 6`}
          {res && !ok ? " · reduza a letra, as margens ou os textos" : ""}
        </p>
      </div>
    </div>
  );
}

function Stepper({ label, value, display, onChange, step, min, max }: { label: string; value: number; display: string; onChange: (v: number) => void; step: number; min: number; max: number }) {
  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) * 100) / 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="min-w-0 flex-1">{label}</span>
      <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-full" aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => set(value - step)}><Minus className="h-4 w-4" /></Button>
      <span className="w-16 text-center tabular-nums">{display}</span>
      <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-full" aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => set(value + step)}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}
const cm = (pt: number) => `${(pt / 28.35).toFixed(1).replace(".", ",")} cm`;

/** Layout da página: Automático (6 níveis) ou Manual (letra, margens, espaçamento). */
export function LayoutEditor({ value, onChange }: { value?: LetterLayout; onChange: (l: LetterLayout | undefined) => void }) {
  const manual = sanitizeLayout(value);
  const L = LAYOUT_LIMITS;
  const upd = (p: Partial<LetterLayout>) => onChange({ ...(manual ?? DEFAULT_MANUAL_LAYOUT), ...p, mode: "manual" });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 rounded-full bg-muted p-1" role="tablist">
        {(["auto", "manual"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={(manual ? "manual" : "auto") === m}
            className={cn("rounded-full py-1.5 text-sm font-medium transition-colors", (manual ? "manual" : "auto") === m ? "bg-background shadow-sm" : "text-muted-foreground")}
            onClick={() => (m === "auto" ? onChange(undefined) : upd({}))}>{m === "auto" ? "Automático" : "Manual"}</button>
        ))}
      </div>
      {!manual ? (
        <p className="text-xs text-muted-foreground">O app reduz espaços, margens e letra (até 11 pt) para a carta caber em 1 página.</p>
      ) : (
        <div className="space-y-2">
          <Stepper label="Letra" value={manual.size} display={`${String(manual.size).replace(".", ",")} pt`} step={0.25} min={L.size[0]} max={L.size[1]} onChange={(size) => upd({ size })} />
          <Stepper label="Margens laterais" value={manual.side} display={cm(manual.side)} step={2.835} min={L.side[0]} max={L.side[1]} onChange={(side) => upd({ side })} />
          <Stepper label="Margem superior" value={manual.top} display={cm(manual.top)} step={2.835} min={L.top[0]} max={L.top[1]} onChange={(top) => upd({ top })} />
          <Stepper label="Margem inferior" value={manual.bottom} display={cm(manual.bottom)} step={2.835} min={L.bottom[0]} max={L.bottom[1]} onChange={(bottom) => upd({ bottom })} />
          <Stepper label="Espaço entre blocos" value={manual.gap} display={`${Math.round(manual.gap * 100)}%`} step={0.05} min={L.gap[0]} max={L.gap[1]} onChange={(gap) => upd({ gap })} />
          <Button type="button" variant="outline" className="w-full" onClick={() => onChange(undefined)}>Voltar ao automático</Button>
        </div>
      )}
    </div>
  );
}

/** Caixa de texto da carta com barra: negrito, itálico, marcador, destaque, tamanho da letra e espaço. */
export function LetterBoxField({ tpl, k, label, rows, onChange }: { tpl: LetterTemplate; k: LetterBoxKey; label: string; rows: number; onChange: (t: LetterTemplate) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const value = String(tpl[k] ?? "");
  const st = boxStyleOf(tpl, k);
  const setStyle = (p: { size?: number | null; above?: number; below?: number }) => {
    const cur = { ...(tpl.boxes?.[k] ?? {}) };
    if ("size" in p) { if (p.size == null) delete cur.size; else cur.size = p.size; }
    if (p.above !== undefined) cur.above = p.above;
    if (p.below !== undefined) cur.below = p.below;
    onChange({ ...tpl, boxes: { ...(tpl.boxes ?? {}), [k]: cur } });
  };
  const apply = (fn: (v: string, s: number, e: number) => { value: string; start: number; end: number }) => {
    const el = ref.current; if (!el) return;
    const r = fn(value, el.selectionStart, el.selectionEnd);
    onChange({ ...tpl, [k]: r.value });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.start, r.end); });
  };
  const size = st.size ?? 11;
  const tb = "h-9 w-9 shrink-0 rounded-lg";
  const keep = (e: React.MouseEvent) => e.preventDefault();
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium">{label}</span>
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center gap-0.5 overflow-x-auto border-b bg-muted/40 px-1 py-1">
          <Button type="button" size="icon" variant="ghost" className={tb} aria-label="Negrito" onMouseDown={keep} onClick={() => apply((v, s, e) => toggleWrap(v, s, e, "**"))}><Bold className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className={tb} aria-label="Itálico" onMouseDown={keep} onClick={() => apply((v, s, e) => toggleWrap(v, s, e, "*"))}><Italic className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className={tb} aria-label="Marcador" onMouseDown={keep} onClick={() => apply(toggleBullets)}><List className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className={tb} aria-label="Destaque" onMouseDown={keep} onClick={() => apply((v, s, e) => toggleWrap(v, s, e, "=="))}><Highlighter className="h-4 w-4" /></Button>
          <span className="mx-1 h-5 w-px shrink-0 bg-border" />
          <Button type="button" size="icon" variant="ghost" className={tb} aria-label="Diminuir letra" disabled={size <= BOX_SIZE_LIMITS[0]} onClick={() => setStyle({ size: Math.max(BOX_SIZE_LIMITS[0], size - 0.5) })}><span className="text-xs font-semibold">A−</span></Button>
          <button type="button" className="h-9 shrink-0 rounded-lg px-1.5 text-xs tabular-nums text-muted-foreground" aria-label="Tamanho automático" onClick={() => setStyle({ size: null })}>{st.size ? `${String(st.size).replace(".", ",")} pt` : "Auto"}</button>
          <Button type="button" size="icon" variant="ghost" className={tb} aria-label="Aumentar letra" disabled={size >= BOX_SIZE_LIMITS[1]} onClick={() => setStyle({ size: Math.min(BOX_SIZE_LIMITS[1], size + 0.5) })}><span className="text-sm font-semibold">A+</span></Button>
          <span className="mx-1 h-5 w-px shrink-0 bg-border" />
          <Button type="button" size="icon" variant="ghost" className={cn(tb, (st.above || st.below) && "text-primary")} aria-label="Espaço acima e abaixo" onClick={() => setSpaceOpen(true)}><MoveVertical className="h-4 w-4" /></Button>
        </div>
        <Textarea ref={ref} rows={rows} maxLength={4000} value={value} className="rounded-none border-0 focus-visible:ring-0" onChange={(e) => onChange({ ...tpl, [k]: e.target.value })} />
      </div>
      <Drawer open={spaceOpen} onOpenChange={setSpaceOpen}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Espaço de “{label}”</DrawerTitle></DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <Stepper label="Acima" value={st.above} display={`${st.above} pt`} step={2} min={0} max={60} onChange={(above) => setStyle({ above })} />
            <Stepper label="Abaixo" value={st.below} display={`${st.below} pt`} step={2} min={0} max={60} onChange={(below) => setStyle({ below })} />
            <Button className="w-full" onClick={() => setSpaceOpen(false)}>Pronto</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
