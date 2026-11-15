import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Painel lateral no estilo "Painel Edge" (One UI) / Slide Over (iOS):
 * uma alça fina na borda direita; tocar ou puxar para a esquerda abre a
 * gaveta, tocar fora, Esc ou arrastar para a direita fecha.
 * Só apresentação: quem usa decide o conteúdo e o que acontece ao escolher.
 */
export function EdgePanel({
  open,
  onOpenChange,
  title,
  handleLabel,
  showHandle = true,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  handleLabel: string;
  /** false = sem alça na borda; o painel só abre por um botão da tela. */
  showHandle?: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [dx, setDx] = useState(0);
  const handleDrag = useRef<{ x: number; opened: boolean } | null>(null);
  const panelDrag = useRef<{ x: number; id: number } | null>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) { setDx(0); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!mounted) return null;

  return createPortal(
    <>
      {!open && showHandle && (
        <button
          type="button"
          aria-label={handleLabel}
          title={handleLabel}
          aria-expanded={false}
          className="fixed right-0 top-[38%] z-40 flex h-28 w-6 touch-none items-center justify-end pr-0.5"
          style={{ marginRight: "env(safe-area-inset-right)" }}
          onPointerDown={(e) => { handleDrag.current = { x: e.clientX, opened: false }; }}
          onPointerMove={(e) => {
            const d = handleDrag.current;
            if (d && !d.opened && d.x - e.clientX > 16) { d.opened = true; onOpenChange(true); }
          }}
          onPointerUp={() => { const d = handleDrag.current; handleDrag.current = null; if (!d?.opened) onOpenChange(true); }}
          onPointerCancel={() => { handleDrag.current = null; }}
        >
          <span aria-hidden className="h-20 w-1.5 rounded-full bg-primary/50 shadow-sm" />
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-foreground/20 animate-in fade-in duration-150" aria-hidden onClick={() => onOpenChange(false)} />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "pointer-events-auto flex max-h-[82dvh] w-[min(82vw,300px)] flex-col overflow-hidden rounded-l-3xl border border-r-0 bg-card text-card-foreground shadow-2xl",
              !dx && "animate-in slide-in-from-right duration-200",
            )}
            style={{ transform: dx ? `translateX(${dx}px)` : undefined, paddingRight: "env(safe-area-inset-right)" }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button,a,input")) return;
              panelDrag.current = { x: e.clientX, id: e.pointerId };
            }}
            onPointerMove={(e) => {
              const d = panelDrag.current;
              if (d && d.id === e.pointerId) setDx(Math.max(0, e.clientX - d.x));
            }}
            onPointerUp={() => { const close = dx > 70; panelDrag.current = null; setDx(0); if (close) onOpenChange(false); }}
            onPointerCancel={() => { panelDrag.current = null; setDx(0); }}
          >
            <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-muted-foreground/30" aria-hidden />
            <h2 className="px-4 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
            <div className="overflow-y-auto overscroll-contain px-2 pb-3">{children}</div>
          </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
