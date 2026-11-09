// Perfil › Bíblia: escolhe uma Bíblia para esboços/anotações e outra para a
// Leitura da Bíblia. Escolha fica só no aparelho; "Igual à Bíblia em uso" desfaz.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getScopedLibraryId, listLibraries, setScopedLibraryId, type BibleLibrary, type BibleScope } from "@/lib/bible-notes-store";

const SAME = "__same__";

export function BibleScopePicker({ refreshKey }: { refreshKey?: unknown }) {
  const { t } = useTranslation();
  const [libs, setLibs] = useState<BibleLibrary[]>([]);
  const [sel, setSel] = useState<Record<BibleScope, string>>({ outlines: SAME, reading: SAME });

  useEffect(() => {
    void listLibraries().then((l) => {
      setLibs(l);
      const pick = (s: BibleScope) => { const id = getScopedLibraryId(s); return id && l.some((x) => x.id === id) ? id : SAME; };
      setSel({ outlines: pick("outlines"), reading: pick("reading") });
    }).catch(() => setLibs([]));
  }, [refreshKey]);

  if (libs.length < 2) return null;

  const change = (s: BibleScope, v: string) => {
    setScopedLibraryId(s, v === SAME ? null : v);
    setSel((p) => ({ ...p, [s]: v }));
  };

  const row = (s: BibleScope, label: string) => (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      <Select value={sel[s]} onValueChange={(v) => change(s, v)}>
        <SelectTrigger className="h-8 w-[52%] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={SAME}>{t("bibleManager.scopeSame", { defaultValue: "Igual à Bíblia em uso" })}</SelectItem>
          {libs.map((l) => (
            <SelectItem key={l.id} value={l.id}>{l.title} ({l.langLabel})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("bibleManager.scopeTitle", { defaultValue: "Usar em cada aba" })}
      </p>
      <div className="divide-y rounded-xl border bg-muted/20">
        {row("outlines", t("bibleManager.scopeOutlines", { defaultValue: "Esboços e anotações" }))}
        {row("reading", t("bibleManager.scopeReading", { defaultValue: "Leitura da Bíblia" }))}
      </div>
    </div>
  );
}
