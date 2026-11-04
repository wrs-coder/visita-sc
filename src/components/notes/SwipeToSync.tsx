import { useRef, useState, type ReactNode } from "react";
import { CloudDownload, CloudUpload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REVEAL = 96;
const TRIGGER = 140;

/**
 * Arrastar o esboço para a ESQUERDA revela "Enviar" (verde) e para a DIREITA
 * revela "Receber" (azul); um arrasto longo executa na hora. Só toque, para
 * não atrapalhar o arrastar com mouse.
 */
export function SwipeToSync({ enabled, onPush, onPull, pushLabel, pullLabel, children }: {
  enabled: boolean;
  onPush: () => void | Promise<void>;
  onPull: () => void | Promise<void>;
  pushLabel: string;
  pullLabel: string;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [busy, setBusy] = useState<"push" | "pull" | null>(null);
  const start = useRef<{ x: number; y: number; base: number; horiz: boolean | null } | null>(null);
  if (!enabled) return <>{children}</>;

  const run = async (which: "push" | "pull") => {
    setBusy(which);
    try { await (which === "push" ? onPush() : onPull()); } finally { setBusy(null); setDx(0); }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {dx > 0 && (
        <button
          type="button"
          aria-label={pullLabel}
          onClick={() => void run("pull")}
          className="absolute inset-y-0 left-0 flex items-center justify-center gap-1 bg-primary px-3 text-xs font-semibold text-primary-foreground"
          style={{ width: Math.max(REVEAL, dx) }}
        >
          {busy === "pull" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
          {pullLabel}
        </button>
      )}
      {dx < 0 && (
        <button
          type="button"
          aria-label={pushLabel}
          onClick={() => void run("push")}
          className="absolute inset-y-0 right-0 flex items-center justify-center gap-1 bg-success px-3 text-xs font-semibold text-success-foreground"
          style={{ width: Math.max(REVEAL, -dx) }}
        >
          {busy === "push" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
          {pushLabel}
        </button>
      )}
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
          if (s.horiz) setDx(Math.min(TRIGGER + 40, Math.max(-TRIGGER - 40, s.base + mx)));
        }}
        onTouchEnd={() => {
          const s = start.current; start.current = null;
          if (!s?.horiz) return;
          if (dx <= -TRIGGER) { void run("push"); return; }
          if (dx >= TRIGGER) { void run("pull"); return; }
          setDx(dx <= -REVEAL / 2 ? -REVEAL : dx >= REVEAL / 2 ? REVEAL : 0);
        }}
        onClickCapture={(e) => { if (dx !== 0) { e.stopPropagation(); e.preventDefault(); setDx(0); } }}
      >
        {children}
      </div>
    </div>
  );
}
