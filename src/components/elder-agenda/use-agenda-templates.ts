// Modelos de pauta do SC: ficam na nuvem da conta (sincronizam entre aparelhos) com cópia no aparelho.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withNetworkWindow } from "@/lib/net-policy";
import { normalizeBlocks, stripForTemplate, type AgendaBlock } from "@/lib/elder-agenda/agenda";

export interface AgendaTemplate { id: string; name: string; blocks: AgendaBlock[]; is_default: boolean }
const CACHE = "visita-sc:agenda-templates";

export function useAgendaTemplates(enabled: boolean) {
  const [list, setList] = useState<AgendaTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try { const c = localStorage.getItem(CACHE); if (c) setList(JSON.parse(c)); } catch { /* sem cópia */ }
    setLoading(true);
    try {
      const { data, error } = await withNetworkWindow(async () =>
        supabase.from("elder_agenda_templates").select("id,name,blocks,is_default").order("created_at"));
      if (error) throw error;
      const next = (data ?? []).map((r) => ({ id: r.id, name: r.name, is_default: r.is_default, blocks: normalizeBlocks(r.blocks) }));
      setList(next);
      try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* cheio */ }
    } catch { /* offline: fica a cópia */ } finally { setLoading(false); }
  }, [enabled]);
  useEffect(() => { void reload(); }, [reload]);

  const create = useCallback(async (name: string, blocks: AgendaBlock[], makeDefault = false) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Entre na sua conta.");
    if (makeDefault) await supabase.from("elder_agenda_templates").update({ is_default: false }).eq("superintendent_id", u.user.id);
    const { error } = await withNetworkWindow(async () => supabase.from("elder_agenda_templates")
      .insert({ superintendent_id: u.user!.id, name: name.slice(0, 120), blocks: stripForTemplate(blocks) as never, is_default: makeDefault }));
    if (error) throw error;
    await reload();
  }, [reload]);

  const update = useCallback(async (id: string, patch: Partial<Pick<AgendaTemplate, "name" | "blocks">>) => {
    const row: Record<string, unknown> = {};
    if (patch.name != null) row.name = patch.name.slice(0, 120);
    if (patch.blocks) row.blocks = stripForTemplate(patch.blocks);
    const { error } = await withNetworkWindow(async () => supabase.from("elder_agenda_templates").update(row as never).eq("id", id));
    if (error) throw error;
    await reload();
  }, [reload]);

  const setDefault = useCallback(async (id: string | null) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await withNetworkWindow(async () => supabase.from("elder_agenda_templates").update({ is_default: false }).eq("superintendent_id", u.user!.id));
    if (id) await withNetworkWindow(async () => supabase.from("elder_agenda_templates").update({ is_default: true }).eq("id", id));
    await reload();
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    const { error } = await withNetworkWindow(async () => supabase.from("elder_agenda_templates").delete().eq("id", id));
    if (error) throw error;
    await reload();
  }, [reload]);

  return { list, loading, reload, create, update, setDefault, remove };
}
