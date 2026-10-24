/**
 * Cartão recolhível somente-visual do painel por código (esposa/anciãos).
 * Estado salvo só neste aparelho (localStorage), por id; tudo aberto por padrão.
 */
import { useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

const KEY = "visita-sc:fold-cards:v1";
type Map = Record<string, true>;
let cache: Map | null = null;
const listeners = new Set<() => void>();
const EMPTY: Map = {};

function read(): Map {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    cache = parsed && typeof parsed === "object" ? (parsed as Map) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export function setFolded(ids: string[], folded: boolean) {
  const next = { ...read() };
  for (const id of ids) {
    if (folded) next[id] = true;
    else delete next[id];
  }
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export function useFolded(): Map {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}

export function FoldCard({ id, icon, title, children }: { id: string; icon?: ReactNode; title: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  const folded = !!useFolded()[id];
  const label = folded ? t("collapse.expand", { defaultValue: "Expandir" }) : t("collapse.collapse", { defaultValue: "Recolher" });
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <button
          type="button"
          onClick={() => setFolded([id], !folded)}
          aria-expanded={!folded}
          aria-label={label}
          className="w-full flex items-center gap-2 font-semibold text-sm text-left"
        >
          {icon}
          <span className="flex-1 min-w-0">{title}</span>
          {folded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </button>
        {!folded && children}
      </CardContent>
    </Card>
  );
}

export function FoldAllButton({ ids }: { ids: string[] }) {
  const { t } = useTranslation();
  const map = useFolded();
  if (ids.length === 0) return null;
  const all = ids.every((id) => map[id]);
  return (
    <button
      type="button"
      onClick={() => setFolded(ids, !all)}
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
    >
      {all ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
      {all ? t("expand.all", { defaultValue: "Expandir tudo" }) : t("collapse.all", { defaultValue: "Recolher tudo" })}
    </button>
  );
}
