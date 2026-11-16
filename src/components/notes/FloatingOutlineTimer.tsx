/**
 * Boia flutuante do cronômetro no Modo Esboço: fica parada ao rolar,
 * arrasta pela alça e se prende à borda mais próxima (estilo One UI).
 * A lógica de tempo é a mesma do OutlineTimer (useOutlineTimer).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { OutlineTimer } from "./OutlineTimer";
import { FLOAT_MARGIN, loadFloatPos, saveFloatPos, snapFloat, type FloatPos } from "@/lib/timer-float-prefs";

const TOP_RESERVED = 96; // não cobre o título nem o ✕

export function FloatingOutlineTimer({ outlineId }: { outlineId: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<FloatPos>(() => loadFloatPos() ?? { side: "right", y: 9999 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const offset = useRef({ dx: 0, dy: 0 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Mantém dentro da tela (rotação, teclado, tamanho salvo antigo).
  useEffect(() => {
    const fix = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setPos((p) => snapFloat(p.side === "left" ? 0 : window.innerWidth, p.y, r.width, r.height, window.innerWidth, window.innerHeight, TOP_RESERVED));
    };
    fix();
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
  }, [mounted]);

  const onDown = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    offset.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: r.left, y: r.top });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ x: e.clientX - offset.current.dx, y: e.clientY - offset.current.dy });
  };
  const onUp = () => {
    const el = ref.current;
    if (!drag || !el) { setDrag(null); return; }
    const r = el.getBoundingClientRect();
    const next = snapFloat(drag.x, drag.y, r.width, r.height, window.innerWidth, window.innerHeight, TOP_RESERVED);
    setPos(next); saveFloatPos(next); setDrag(null);
  };

  if (!mounted) return null;
  const style: React.CSSProperties = drag
    ? { left: drag.x, top: drag.y }
    : {
        top: pos.y,
        [pos.side]: `calc(${FLOAT_MARGIN}px + env(safe-area-inset-${pos.side}, 0px))`,
        transition: "top 180ms ease, left 180ms ease, right 180ms ease",
      };

  return createPortal(
    <div
      ref={ref}
      style={style}
      className="fixed z-[110] flex items-center gap-0.5 rounded-2xl border bg-background/95 p-1 shadow-lg backdrop-blur max-w-[calc(100vw-1rem)]"
    >
      <button
        type="button"
        aria-label={t("personalOutlines.timer.move", { defaultValue: "Mover cronômetro" })}
        title={t("personalOutlines.timer.move", { defaultValue: "Mover cronômetro" })}
        className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground active:cursor-grabbing"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <OutlineTimer outlineId={outlineId} variant="toolbar" className="border-0" />
    </div>,
    document.body,
  );
}
