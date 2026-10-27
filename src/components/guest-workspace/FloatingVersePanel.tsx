// Botão flutuante 📖 com versículos detectados e consultas recentes.
// Arrastável, encaixa na borda mais próxima; posição salva neste aparelho.
// Ao tocar numa referência o painel fecha e o versículo abre na tela.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown } from "lucide-react";
import { VerseLink } from "@/components/bible/BibleVersePopover";
import { BibleHistoryChips } from "@/components/bible/BibleHistoryChips";
import type { CitationMatch } from "@/lib/bible-refs";
import type { BibleLibrary } from "@/lib/bible-notes-store";
import { cn } from "@/lib/utils";

type Pos = { side: "left" | "right"; y: number };

export function FloatingVersePanel({ library, detected, onInsert, storageKey = "guestWs.versePanel.pos" }: {
  library: BibleLibrary | null; detected: CitationMatch[]; onInsert: (text: string) => void;
  /** Chave da posição salva neste aparelho (cada tela guarda a sua). */
  storageKey?: string;
}) {
  const POS_KEY = storageKey;
  const { t } = useTranslation();
  const [pos, setPos] = useState<Pos>({ side: "right", y: 0.7 });
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ m: CitationMatch; n: number } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(POS_KEY) ?? "null"); if (v && (v.side === "left" || v.side === "right") && typeof v.y === "number") setPos(v); } catch { /* */ }
  }, []);

  const pick = (m: CitationMatch) => { setOpen(false); setPicked((p) => ({ m, n: (p?.n ?? 0) + 1 })); };

  const onDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY, moved: false }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) return;
    s.moved = true; setDrag({ x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current; start.current = null;
    if (!s?.moved) { setOpen((v) => !v); return; }
    const h = window.innerHeight;
    const next: Pos = { side: e.clientX < window.innerWidth / 2 ? "left" : "right", y: Math.min(0.88, Math.max(0.1, e.clientY / h)) };
    setPos(next); setDrag(null);
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* */ }
  };

  const style: React.CSSProperties = drag
    ? { left: drag.x - 24, top: drag.y - 24 }
    : { top: `calc(${pos.y * 100}% - 24px)`, [pos.side]: 12 };

  return (
    <>
      <button type="button" aria-label={t("guestWs.versesPanel", { defaultValue: "Versículos" })} aria-expanded={open}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        style={style}
        className={cn("fixed z-[60] flex h-12 w-12 touch-none items-center justify-center rounded-full border bg-card text-primary shadow-lg", !drag && "transition-all")}>
        <BookOpen className="h-5 w-5" />
        {detected.length > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">{detected.length}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-h-[45vh] max-w-xl space-y-2 overflow-y-auto rounded-2xl border bg-card p-3 shadow-xl">
          <button type="button" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="flex-1 text-left">{t("fieldConsiderations.detected", { defaultValue: "Versículos detectados" })}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {!library ? <p className="text-xs text-muted-foreground">{t("guestWs.noBibleDetect", { defaultValue: "Importe a Bíblia (EPUB) na gaveta de configurações para ver os versículos." })}</p>
            : detected.length === 0 ? <p className="text-xs text-muted-foreground">{t("fieldConsiderations.detectedEmpty", { defaultValue: "Digite uma citação (ex.: João 3:16) para visualizar." })}</p>
            : <div className="flex flex-wrap gap-1.5">{detected.map((m, i) => (
                <button key={`${m.index}-${i}`} type="button" onClick={() => pick(m)} className="rounded-full border px-2.5 py-0.5 text-xs text-primary hover:bg-accent/60">{m.raw}</button>
              ))}</div>}
          <BibleHistoryChips library={library} onPick={pick} />
        </div>
      )}
      {picked && library && (
        <div className="fixed left-1/2 top-1/3 z-[60]">
          <VerseLink key={picked.n} match={picked.m} libraryId={library.id} onInsert={onInsert}
            autoOpen hideTrigger onClosed={() => setPicked(null)} />
        </div>
      )}
    </>
  );
}
