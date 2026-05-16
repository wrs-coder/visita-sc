import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

const KEY = "visita-sc:autobackup";

// Lightweight local snapshot of the tables most likely to change during a visit.
// We listen to realtime changes for the user's congregation and refresh
// the cached blob on every event.

interface Snapshot {
  updatedAt: string;
  tables: Record<string, unknown[]>;
}

const TABLES_BY_VISIT = [
  "checklist_items", "field_meetings", "field_assignments",
  "schedule_events", "meals", "transport_schedule",
];

export function useAutoBackup() {
  const { role, congregation } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => {
    if (typeof window === "undefined") return null;
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  useEffect(() => {
    if (role !== "superintendent" || !congregation?.id) return;
    const congId = congregation.id;

    const snapshotNow = async () => {
      const { data: visits = [] } = await supabase
        .from("visits").select("*").eq("congregation_id", congId);
      const visitIds = (visits ?? []).map((v) => v.id);
      const tables: Record<string, unknown[]> = { visits: visits ?? [] };
      if (visitIds.length) {
        for (const t of TABLES_BY_VISIT) {
          const { data } = await supabase.from(t).select("*").in("visit_id", visitIds);
          tables[t] = data ?? [];
        }
      }
      const snap: Snapshot = { updatedAt: new Date().toISOString(), tables };
      try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* quota */ }
      setSnapshot(snap);
    };

    snapshotNow();
    const ch = supabase.channel(`autobackup-${congId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter: `congregation_id=eq.${congId}` }, snapshotNow);
    for (const t of TABLES_BY_VISIT) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, snapshotNow);
    }
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [role, congregation?.id]);

  return snapshot;
}
