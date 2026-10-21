// Telas deslizantes do Dashboard em todas as larguras (celular, tablet,
// computador). Seletor rápido + carrossel horizontal com scroll-snap.
// A tela visível monta primeiro; as demais montam com o aparelho ocioso
// e nunca são desmontadas. Em telas largas os cartões ficam em 2 colunas.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DashboardPage = { id: string; label: string; content: ReactNode; badge?: boolean };

const STORAGE_KEY = "dashboard.pager.page";

export function DashboardPager({ pages, unreadLabel = "Recados não lidos" }: { pages: DashboardPage[]; unreadLabel?: string }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [active, setActive] = useState(pages[0]?.id ?? "");
  const restored = useRef(false);
  const [mounted, setMounted] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (mounted) return;
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    const first = pages.some((p) => p.id === saved) ? saved! : pages[0]?.id;
    setMounted(new Set(first ? [first] : []));
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const mountAll = () => setMounted(new Set(pages.map((p) => p.id)));
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(mountAll, { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(mountAll, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMounted = (id: string) => !mounted || mounted.has(id) || mounted.size >= pages.length;

  useEffect(() => {
    if (restored.current || !trackRef.current) return;
    restored.current = true;
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    const idx = pages.findIndex((p) => p.id === saved);
    if (idx > 0) {
      const el = trackRef.current;
      requestAnimationFrame(() => requestAnimationFrame(() => { el.scrollLeft = idx * el.clientWidth; }));
      setActive(pages[idx].id);
    }
  }, [pages]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
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
    let settle = 0;
    const snapNearest = () => {
      const w = Math.max(1, el.clientWidth);
      const idx = Math.min(pages.length - 1, Math.max(0, Math.round(el.scrollLeft / w)));
      if (Math.abs(el.scrollLeft - idx * w) > 1) el.scrollTo({ left: idx * w, behavior: "smooth" });
    };
    const onScrollSettle = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(snapNearest, 140);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scroll", onScrollSettle, { passive: true });
    el.addEventListener("scrollend", snapNearest);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scroll", onScrollSettle);
      el.removeEventListener("scrollend", snapNearest);
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [pages]);

  const activeIdx = Math.max(0, pages.findIndex((p) => p.id === active));
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const section = el.children[activeIdx] as HTMLElement | undefined;
    if (!section) return;
    let lastW = el.clientWidth;
    const apply = () => {
      el.style.height = `${section.offsetHeight}px`;
      if (el.clientWidth !== lastW) {
        lastW = el.clientWidth;
        el.scrollLeft = activeIdx * el.clientWidth;
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(section);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeIdx]);

  const goTo = (id: string) => {
    const el = trackRef.current;
    const idx = pages.findIndex((p) => p.id === id);
    if (!el || idx < 0) return;
    const fresh = !!mounted && !mounted.has(id);
    setMounted((m) => (m && !m.has(id) ? new Set([...m, id]) : m));
    el.scrollTo({ left: idx * el.clientWidth, behavior: fresh ? "auto" : "smooth" });
    setActive(id);
    try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = pages.length - 1;
    let next = -1;
    if (e.key === "ArrowRight") next = activeIdx >= last ? 0 : activeIdx + 1;
    else if (e.key === "ArrowLeft") next = activeIdx <= 0 ? last : activeIdx - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next < 0) return;
    e.preventDefault();
    goTo(pages[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Telas do painel"
        onKeyDown={onTabKey}
        className="sticky top-14 z-20 -mx-1 grid gap-1 rounded-xl border bg-card p-1 shadow-sm md:mx-auto md:max-w-2xl"
        style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}
      >
        {pages.map((p, i) => (
          <button
            key={p.id}
            ref={(n) => { tabRefs.current[i] = n; }}
            type="button"
            role="tab"
            aria-selected={active === p.id}
            tabIndex={active === p.id ? 0 : -1}
            data-state={active === p.id ? "active" : "inactive"}
            onClick={() => goTo(p.id)}
            className={cn(
              "min-h-9 rounded-lg px-1 text-xs font-semibold transition-colors md:text-sm",
              active === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/60",
            )}
          >
            <span className="relative inline-flex items-center">
              {p.label}
              {p.badge && (
                <>
                  <span aria-hidden="true" className="absolute -right-2.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-card" style={{ background: "var(--accent-couple)" }} />
                  <span className="sr-only">{unreadLabel}</span>
                </>
              )}
            </span>
          </button>
        ))}
      </div>
      <div
        ref={trackRef}
        className="-mx-4 flex items-start snap-x snap-mandatory overflow-x-auto md:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ overscrollBehaviorX: "contain", touchAction: "pan-x pan-y" }}
      >
        {pages.map((p) => (
          <section
            key={p.id}
            role="tabpanel"
            aria-label={p.label}
            className="w-full shrink-0 snap-start snap-always space-y-6 px-4 md:px-0 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0 lg:[&>*]:w-full lg:[&>*]:min-w-0"
          >
            {isMounted(p.id) || p.id === active ? p.content : <div className="min-h-[60vh]" aria-hidden="true" />}
          </section>
        ))}
      </div>
    </div>
  );
}
