/**
 * Recolher/expandir por dia, seção e evento nas abas da visita.
 * Estado só de apresentação, salvo no localStorage do aparelho
 * (por usuário, visita e aba). Conteúdo recolhido fica apenas oculto
 * (classe `hidden`), nunca desmontado — rascunhos e digitação são preservados.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Store = Record<string, true>;

interface Ctx {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  setAll: (ids: string[], open: boolean) => void;
}

const CollapseCtx = createContext<Ctx | null>(null);

function readStore(key: string): Store {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

export function CollapseProvider({ scope, visitId, children }: { scope: string; visitId?: string | null; children: ReactNode }) {
  const { user } = useAuth();
  const key = `visita-sc:collapse:v1:${user?.id ?? "anon"}:${visitId ?? "none"}:${scope}`;
  const [collapsed, setCollapsed] = useState<Store>({});

  useEffect(() => {
    setCollapsed(readStore(key));
  }, [key]);

  const persist = useCallback(
    (next: Store) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  const value = useMemo<Ctx>(
    () => ({
      isOpen: (id) => !collapsed[id],
      toggle: (id) =>
        setCollapsed((prev) => {
          const next = { ...prev };
          if (next[id]) delete next[id];
          else next[id] = true;
          persist(next);
          return next;
        }),
      setAll: (ids, open) =>
        setCollapsed((prev) => {
          const next = { ...prev };
          for (const id of ids) {
            if (open) delete next[id];
            else next[id] = true;
          }
          persist(next);
          return next;
        }),
    }),
    [collapsed, persist],
  );

  return <CollapseCtx.Provider value={value}>{children}</CollapseCtx.Provider>;
}

function useCollapse(): Ctx {
  return (
    useContext(CollapseCtx) ?? {
      isOpen: () => true,
      toggle: () => {},
      setAll: () => {},
    }
  );
}

export function useCollapseOpen(id: string) {
  const c = useCollapse();
  return [c.isOpen(id), () => c.toggle(id)] as const;
}

export function CollapseToggle({ open, onToggle, className }: { open: boolean; onToggle: () => void; className?: string }) {
  const { t } = useTranslation();
  const label = open
    ? t("collapse.collapse", { defaultValue: "Recolher" })
    : t("collapse.expand", { defaultValue: "Expandir" });
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
        className,
      )}
    >
      <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
    </span>
  );
}

/** Corpo recolhível — oculto, nunca desmontado. */
export function CollapseBody({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const c = useCollapse();
  return <div className={cn(!c.isOpen(id) && "hidden", className)}>{children}</div>;
}

/**
 * Item (evento) recolhível: barra fina com resumo + setinha acima do cartão.
 */
export function CollapseItem({ id, summary, children }: { id: string; summary: ReactNode; children: ReactNode }) {
  const c = useCollapse();
  const open = c.isOpen(id);
  return (
    <div className="mb-2">
      <div
        className={cn(
          "flex min-w-0 items-center gap-1 rounded-md px-1",
          !open && "border bg-muted/30",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</span>
        <CollapseToggle open={open} onToggle={() => c.toggle(id)} />
      </div>
      <div className={cn(!open && "hidden")}>{children}</div>
    </div>
  );
}

export function CollapseAllButton({ ids, className }: { ids: string[]; className?: string }) {
  const { t } = useTranslation();
  const c = useCollapse();
  const anyOpen = ids.some((id) => c.isOpen(id));
  if (ids.length === 0) return null;
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => c.setAll(ids, !anyOpen)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          c.setAll(ids, !anyOpen);
        }
      }}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
        className,
      )}
    >
      {anyOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
      {anyOpen
        ? t("collapse.collapseAll", { defaultValue: "Recolher tudo" })
        : t("collapse.expandAll", { defaultValue: "Expandir tudo" })}
    </span>
  );
}

/** Setinha ligada ao contexto (para títulos de dia/seção). */
export function CollapseIdToggle({ id, className }: { id: string; className?: string }) {
  const [open, toggle] = useCollapseOpen(id);
  return <CollapseToggle open={open} onToggle={toggle} className={className} />;
}
