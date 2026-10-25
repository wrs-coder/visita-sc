// Atualização imediata na tela para alterações que ficaram na fila offline.
// Só toca em linhas já presentes no cache (por `id`): aplica o patch de um
// UPDATE ou remove a linha de um DELETE. Nunca inventa linhas novas, então
// não há risco de mostrar dados que o servidor não tenha.
import type { QueryClient } from "@tanstack/react-query";

type Row = Record<string, unknown>;
type Write = {
  op: "insert" | "update" | "upsert" | "delete";
  payload?: Row | Row[];
  match?: Row;
};

export function applyToValue(value: unknown, w: Write): unknown {
  const id = w.match?.id;
  if (id === undefined || id === null) return value;
  if (Array.isArray(value)) {
    let changed = false;
    const out: unknown[] = [];
    for (const item of value) {
      if (item && typeof item === "object" && (item as Row).id === id) {
        changed = true;
        if (w.op === "delete") continue;
        out.push({ ...(item as Row), ...(w.payload as Row) });
      } else out.push(item);
    }
    return changed ? out : value;
  }
  if (value && typeof value === "object" && (value as Row).id === id && w.op === "update") {
    return { ...(value as Row), ...(w.payload as Row) };
  }
  return value;
}

export function applyOptimisticWrite(qc: QueryClient, w: Write): void {
  if (w.op !== "update" && w.op !== "delete") return;
  if (w.op === "update" && (!w.payload || Array.isArray(w.payload))) return;
  try {
    qc.setQueriesData({ predicate: () => true }, (old: unknown) => applyToValue(old, w));
  } catch (err) {
    console.warn("[optimistic-cache] falha ao aplicar alteração local", err);
  }
}
