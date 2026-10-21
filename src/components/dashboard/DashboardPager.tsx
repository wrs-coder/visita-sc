// Etapa 4 — Telas deslizantes do Dashboard (só no celular).
// No celular: seletor rápido + carrossel horizontal com scroll-snap.
// A partir de md: todas as telas empilhadas, como a lista de sempre.
// Todas as telas ficam montadas (nada se perde ao trocar).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type DashboardPage = { id: string; label: string; content: ReactNode };

const STORAGE_KEY = "dashboard.pager.page";

export function DashboardPager({ pages }: { pages: DashboardPage[] }) {
  const isMobile = useIsMobile();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(pages[0]?.id ?? "");
  const restored = useRef(false);

  // Restaura a última tela após hidratação.
  useEffect(() => {
    if (!isMobile || restored.current || !trackRef.current) return;
    restored.current = true;
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    const idx = pages.findIndex((p) => p.id === saved);
    if (idx > 0) {
      const el = trackRef.current;
      requestAnimationFrame(() => { el.scrollLeft = idx * el.clientWidth; });
      setActive(pages[idx].id);
    }
  }, [isMobile, pages]);

  // Marca a aba visível conforme o deslize.
  useEffect(() => {
    const el = trackRef.current;
    if (!isMobile || !el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        const p = pages[Math.min(pages.length - 1, Math.max(0, idx))];
        if (p) {
          setActive(p.id);
          try { window.localStorage.setItem(STORAGE_KEY, p.id); } catch { /* ignore */ }
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [isMobile, pages]);

  // A altura acompanha a tela ativa (evita espaço vazio nas telas curtas).
  const activeIdx = Math.max(0, pages.findIndex((p) => p.id === active));
  useEffect(() => {
    const el = trackRef.current;
    if (!isMobile || !el) return;
    const section = el.children[activeIdx] as HTMLElement | undefined;
    if (!section) return;
    const apply = () => { el.style.height = `${section.offsetHeight}px`; };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(section);
    return () => ro.disconnect();
  }, [isMobile, activeIdx]);

  if (!isMobile) {
    return <div className="space-y-6">{pages.map((p) => <div key={p.id} className="space-y-6">{p.content}</div>)}</div>;
  }

  const goTo = (id: string) => {
    const el = trackRef.current;
    const idx = pages.findIndex((p) => p.id === id);
    if (!el || idx < 0) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setActive(id);
  };

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Telas do painel"
        className="sticky top-14 z-20 -mx-1 grid gap-1 rounded-xl border bg-card p-1 shadow-sm"
        style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}
      >
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active === p.id}
            onClick={() => goTo(p.id)}
            className={cn(
              "min-h-9 rounded-lg px-1 text-xs font-semibold transition-colors",
              active === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/60",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        ref={trackRef}
        className="-mx-4 flex items-start snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ overscrollBehaviorX: "contain", touchAction: "pan-x pan-y" }}
      >
        {pages.map((p) => (
          <section
            key={p.id}
            role="tabpanel"
            aria-label={p.label}
            className="w-full shrink-0 snap-start snap-always space-y-6 px-4"
          >
            {p.content}
          </section>
        ))}
      </div>
    </div>
  );
}
