// Seção recolhível (cabeçalho estilo iOS/One UI) para as caixas da Leitura da Bíblia.
// O conteúdo só é escondido, nunca desmontado: textos digitados continuam lá.
// Estado aberto/fechado fica só neste aparelho.
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "bible.collapse";

function readClosed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}; } catch { return {}; }
}

export function CollapsibleSection({ id, title, summary, children, defaultOpen = true }: { id: string; title: string; summary?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { const v = readClosed()[id]; if (typeof v === "boolean") setOpen(!v); }, [id]);
  const toggle = () => {
    const n = !open; setOpen(n);
    try { const all = readClosed(); all[id] = !n; localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* */ }
  };
  return (
    <section className="space-y-1.5">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="flex min-h-9 w-full items-center gap-2 rounded-lg px-1 text-left active:bg-accent/40">
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", !open && "-rotate-90")} />
        <span className="text-xs font-semibold uppercase text-muted-foreground">{title}</span>
        {!open && summary != null && <span className="ml-auto truncate pl-2 text-xs text-foreground/80">{summary}</span>}
      </button>
      <div hidden={!open}>{children}</div>
    </section>
  );
}
