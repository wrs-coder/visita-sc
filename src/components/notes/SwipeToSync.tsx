import { useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const REVEAL = 96;
const TRIGGER = 140;

/** Swipe a row to the left to reveal a sync action; a long swipe syncs at once. Touch only, so mouse drag-and-drop is untouched. */
export function SwipeToSync({ enabled, onSync, label, children }: {
  enabled: boolean; onSync: () => void | Promise<void>; label: string; children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; horiz: boolean | null } | null>(null);
  if (!enabled) return <>{children}</>;

  const run = async () => {
    setBusy(true);
    try { await onSync(); } finally { setBusy(false); setDx(0); }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <button
        type="button"
        aria-label={label}
        onClick={run}
        className="absolute inset-y-0 right-0 flex items-center gap-1 bg-success px-3 text-xs font-semibold text-success-foreground"
        style={{ width: Math.max(REVEAL, -dx) }}
      >
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
        {label}
      </button>
      <div
        className={cn("relative bg-card", !start.current && "transition-transform duration-200")}
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          start.current = { x: t.clientX, y: t.clientY, base: dx, horiz: null };
        }}
        onTouchMove={(e) => {
          const s = start.current; if (!s) return;
          const t = e.touches[0];
          const mx = t.clientX - s.x, my = t.clientY - s.y;
          if (s.horiz === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.horiz = Math.abs(mx) > Math.abs(my);
          if (s.horiz) setDx(Math.min(0, Math.max(-TRIGGER - 40, s.base + mx)));
        }}
        onTouchEnd={() => {
          const s = start.current; start.current = null;
          if (!s?.horiz) return;
          if (dx <= -TRIGGER) { void run(); return; }
          setDx(dx <= -REVEAL / 2 ? -REVEAL : 0);
        }}
        onClickCapture={(e) => { if (dx !== 0) { e.stopPropagation(); e.preventDefault(); setDx(0); } }}
      >
        {children}
      </div>
    </div>
  );
}
