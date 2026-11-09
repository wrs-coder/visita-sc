// Topo comum das abas do "Programa da visita": congregação (só superintendente)
// e o aviso de como a aba salva. Só visual — cada aba mantém o seu jeito de salvar.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useLocation } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { listMyCongregations } from "@/lib/congregations.functions";
import {
  useActiveCongregation,
  getActiveCongregationOverride,
  setActiveCongregationOverride,
} from "@/hooks/use-active-congregation";

/** Abas que guardam rascunho e têm os próprios botões Descartar/Salvar. */
const DRAFT_TABS = ["/reunioes-discursos"];

export function VisitProgramTopBar() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { pathname } = useLocation();
  const isSuper = role === "superintendent";
  const autoSaves = !DRAFT_TABS.includes(pathname);
  return (
    <div className="mb-4 space-y-2">
      {isSuper && <CongregationRow />}
      {autoSaves && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          {t("visitProgram.autoSaved", { defaultValue: "Salvo automaticamente ao sair de cada campo" })}
        </p>
      )}
    </div>
  );
}

function CongregationRow() {
  const { t } = useTranslation();
  const fnList = useServerFn(listMyCongregations);
  const [congs, setCongs] = useState<{ id: string; name: string }[]>([]);
  const active = useActiveCongregation();
  const [value, setValue] = useState<string>(active?.id ?? "");

  useEffect(() => {
    void (async () => {
      const res = await fnList();
      if (res.ok) setCongs((res.data as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })));
    })();
  }, [fnList]);

  useEffect(() => {
    setValue(getActiveCongregationOverride() ?? active?.id ?? "");
  }, [active?.id]);

  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{t("meetingsTalks.selectedCongregation")}</span>
      <Select value={value} onValueChange={(id) => { setValue(id); setActiveCongregationOverride(id); }}>
        <SelectTrigger className="h-8 flex-1 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus:ring-0">
          <SelectValue placeholder={t("meetingsTalks.chooseCongregation")} />
        </SelectTrigger>
        <SelectContent>
          {congs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
