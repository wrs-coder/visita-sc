import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVisitTemplateExtras } from "@/hooks/use-visit-template-extras";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TALK_KINDS, FIELDS_BY_KIND, DEFAULT_LABELS, fieldLabelKey, canSyncKind, talkSyncPatch, isTalkKind,
  type TalkInfo, type TalkField,
} from "@/lib/talk-outline-info";

/** Busca os dados da aba "Reuniões e Discursos" da visita e preenche o esboço. */
export function useTalkSync(visitId: string | null | undefined, talk: TalkInfo | undefined, onChange: (t: TalkInfo) => void) {
  const { t } = useTranslation();
  const extras = useVisitTemplateExtras(visitId);
  const [syncing, setSyncing] = useState(false);
  const kind = talk?.kind ?? null;
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const can = !!visitId && canSyncKind(kind) && !offline;

  const sync = async () => {
    if (!visitId || !kind) return;
    setSyncing(true);
    try {
      const [mid, pio, eld] = await Promise.all([
        kind === "service_initial"
          ? supabase.from("midweek_meetings").select("closing_prayer").eq("visit_id", visitId).maybeSingle()
          : Promise.resolve({ data: null }),
        kind === "pioneer_meeting"
          ? supabase.from("pioneer_meetings").select("opening_prayer,closing_prayer").eq("visit_id", visitId).maybeSingle()
          : Promise.resolve({ data: null }),
        kind === "elders_meeting"
          ? supabase.from("elders_servants_meetings").select("opening_prayer,closing_prayer").eq("visit_id", visitId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const m = mid.data as { closing_prayer?: string | null } | null;
      const p = pio.data as { opening_prayer?: string | null; closing_prayer?: string | null } | null;
      const e = eld.data as { opening_prayer?: string | null; closing_prayer?: string | null } | null;
      const patch = talkSyncPatch(kind, {
        weekend_opening_song: extras.weekend?.opening_song,
        weekend_closing_song: extras.weekend?.closing_song,
        midweek_final_song: extras.midweek?.final_song,
        midweek_closing_prayer: m?.closing_prayer,
        pioneer_opening_prayer: p?.opening_prayer,
        pioneer_closing_prayer: p?.closing_prayer,
        elders_opening_prayer: e?.opening_prayer,
        elders_closing_prayer: e?.closing_prayer,
      });
      if (!Object.keys(patch).length) {
        toast.info(t("talkOutline.sync.empty", { defaultValue: "Nada preenchido em Reuniões e Discursos para este tipo." }));
        return;
      }
      onChange({ ...(talk ?? {}), ...patch });
      toast.success(t("talkOutline.sync.success", { defaultValue: "Informações sincronizadas." }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };
  return { sync, syncing, can, offline };
}

export function TalkOutlineFields({
  talk, onChange, visitId,
}: { talk: TalkInfo | undefined; onChange: (t: TalkInfo) => void; visitId: string | null | undefined }) {
  const { t } = useTranslation();
  const tr = (k: string, d: string) => t(k, { defaultValue: d });
  const kind = talk?.kind ?? null;
  const { sync, syncing, can, offline } = useTalkSync(visitId, talk, onChange);
  const set = (f: TalkField, v: string) => onChange({ ...(talk ?? {}), [f]: v });

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 w-full max-w-full min-w-0">
      <div className="grid gap-1.5 min-w-0">
        <Label>{tr("talkOutline.kindLabel", "Tipo de esboço")}</Label>
        <Select
          value={kind ?? "__none"}
          onValueChange={(v) => onChange({ ...(talk ?? {}), kind: isTalkKind(v) ? v : null })}
        >
          <SelectTrigger className="w-full max-w-full min-w-0">
            <SelectValue placeholder={tr("talkOutline.kindPh", "Escolha o tipo")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">{tr("talkOutline.kindNone", "Sem tipo")}</SelectItem>
            {TALK_KINDS.map((k) => (
              <SelectItem key={k} value={k}>{tr(`talkOutline.kinds.${k}`, DEFAULT_LABELS[k])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {kind && (
        <>
          {canSyncKind(kind) && (
            <div>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => void sync()}
                disabled={!can || syncing}
                title={offline ? tr("talkOutline.sync.offline", "Sem internet") : !visitId ? tr("talkOutline.sync.noVisit", "Nenhuma visita ativa") : undefined}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1.5", syncing && "animate-spin")} />
                {tr("talkOutline.sync.button", "Sincronizar de Reuniões e Discursos")}
              </Button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2 min-w-0">
            {FIELDS_BY_KIND[kind].map((f) => {
              const l = fieldLabelKey(kind, f);
              return (
                <div key={f} className="grid gap-1.5 min-w-0">
                  <Label>{tr(l.key, l.fallback)}</Label>
                  <Input value={talk?.[f] ?? ""} onChange={(e) => set(f, e.target.value)} className="w-full max-w-full min-w-0" />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
