/**
 * Boia flutuante genérica (estilo One UI): fica parada ao rolar, arrasta e
 * se prende à borda mais próxima; a posição fica salva neste aparelho.
 *
 * - mode "grip": arrasta só pela alça ⋮ (o conteúdo continua clicável).
 * - mode "whole": a boia toda arrasta; um toque sem arrastar chama onTap.
 *
 * Portal: vai para o diálogo mais próximo (Radix bloqueia cliques fora dele)
 * ou para o body (listas com content-visibility prendem position:fixed).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLOAT_MARGIN, loadFloatPos, saveFloatPos, snapFloat, type FloatPos } from "@/lib/timer-float-prefs";

export function FloatingDock({
  storageKey, defaultPos, topReserved = 96, mode = "grip", onTap, onClose, gripLabel, closeLabel, className, children, hidden,
}: {
  storageKey?: string;
  defaultPos: FloatPos;
  topReserved?: number;
  mode?: "grip" | "whole";
  onTap?: () => void;
  onClose?: () => void;
  gripLabel?: string;
  closeLabel?: string;
  className?: string;
  children: ReactNode;
  hidden?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<FloatPos>(() => loadFloatPos(storageKey) ?? defaultPos);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    const dlg = sentinel.current?.closest<HTMLElement>('[role="dialog"]');
    setTarget(dlg ?? document.body);
  }, []);

  // Mantém dentro da tela (rotação, teclado, posição salva antiga).
  useEffect(() => {
    if (!target) return;
    const fix = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setPos((p) => snapFloat(p.side === "left" ? 0 : window.innerWidth, p.y, r.width, r.height, window.innerWidth, window.innerHeight, topReserved));
    };
    fix();
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
  }, [target, topReserved]);

  const onDown = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    start.current = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) return;
    s.moved = true;
    setDrag({ x: e.clientX - s.dx, y: e.clientY - s.dy });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current; start.current = null;
    const el = ref.current;
    if (!s || !s.moved || !el) { setDrag(null); if (s && !s.moved && mode === "whole") onTap?.(); return; }
    const r = el.getBoundingClientRect();
    const next = snapFloat(e.clientX - s.dx, e.clientY - s.dy, r.width, r.height, window.innerWidth, window.innerHeight, topReserved);
    setPos(next); if (storageKey) saveFloatPos(next, storageKey); setDrag(null);
  };

  const style: React.CSSProperties = drag
    ? { left: drag.x, top: drag.y }
    : {
        top: pos.y,
        [pos.side]: `calc(${FLOAT_MARGIN}px + env(safe-area-inset-${pos.side}, 0px))`,
        transition: "top 180ms ease, left 180ms ease, right 180ms ease",
      };
  const handlers = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };

  return (
    <>
      <span ref={sentinel} hidden aria-hidden />
      {target && !hidden && createPortal(
        <div
          ref={ref}
          style={style}
          className={cn("fixed z-[110] max-w-[calc(100vw-1rem)]", mode === "whole" && "touch-none select-none", className)}
          {...(mode === "whole" ? handlers : {})}
        >
          {mode === "grip" ? (
            <div className="flex items-center gap-0.5 rounded-2xl border bg-background/95 p-1 shadow-lg backdrop-blur">
              <button
                type="button"
                aria-label={gripLabel}
                title={gripLabel}
                className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground active:cursor-grabbing"
                {...handlers}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              {children}
              {onClose && (
                <button
                  type="button"
                  aria-label={closeLabel}
                  title={closeLabel}
                  onClick={onClose}
                  className="flex h-9 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : children}
        </div>,
        target,
      )}
    </>
  );
}
