import type { ReactNode } from "react";

export type InfoRow = [label: string, value: ReactNode | null | undefined | false];

/** Lista "título → informação" no padrão dos cartões do painel. Linhas vazias somem. */
export function InfoList({ rows }: { rows: InfoRow[] }) {
  const visible = rows.filter(([, v]) => v !== null && v !== undefined && v !== false && !(typeof v === "string" && !v.trim()));
  if (!visible.length) return null;
  return (
    <dl className="grid grid-cols-1 gap-y-1 text-xs sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:gap-x-3">
      {visible.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words whitespace-pre-wrap font-medium text-foreground mb-1 sm:mb-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
