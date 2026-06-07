// Pré-carga de TODAS as tabelas relevantes para o usuário ativo, gravando o
// resultado no TanStack Query cache (que é persistido em IndexedDB pelo
// query-persister). 100% read-only — sem mutações, sem triggers, sem mudanças
// em updated_at/sync_status. Falhas individuais não abortam o fluxo.
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { prefetchRouteShells } from "@/lib/offline-shells";

export const OFFLINE_READY_KEY = "visita-sc:offline-ready";

export type ProgressEvent = {
  step: number;
  total: number;
  label: string;
  errors: number;
};

export type PrefetchOpts = {
  queryClient: QueryClient;
  userId: string;
  congregationId: string | null;
  role: "superintendent" | "elder" | null;
  signal?: AbortSignal;
  onProgress?: (e: ProgressEvent) => void;
  t?: (key: string) => string;
};

type StepFn = () => Promise<void>;
type Step = { label: string; run: StepFn };

export async function prefetchAllForOffline(opts: PrefetchOpts): Promise<{
  completed: number;
  errors: number;
  aborted: boolean;
}> {
  const { queryClient, userId, congregationId, role, signal, onProgress, t } = opts;
  const tr = (k: string, fallback: string) => (t ? t(k) : fallback);

  const set = (key: unknown[], data: unknown) => {
    try {
      queryClient.setQueryData(key, data);
    } catch (e) {
      console.warn("[offline-prefetch] setQueryData falhou", key, e);
    }
  };

  const fetchTable = async <T = unknown>(
    table: string,
    apply: (q: ReturnType<typeof supabase.from>) => unknown,
  ): Promise<T[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = apply(supabase.from(table as never));
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  };

  const visitIds: string[] = [];
  const templateIds = {
    program: [] as string[],
    checklist: [] as string[],
    fieldMeeting: [] as string[],
    talk: [] as string[],
    elderProgram: [] as string[],
  };

  const steps: Step[] = [
    {
      label: tr("offline.step.profile", "Perfil"),
      run: async () => {
        const data = await fetchTable("profiles", (q) => q.select("*").eq("id", userId));
        set(["offline", "profile", userId], data[0] ?? null);
      },
    },
    {
      label: tr("offline.step.roles", "Permissões"),
      run: async () => {
        const data = await fetchTable("user_roles", (q) => q.select("*").eq("user_id", userId));
        set(["offline", "user_roles", userId], data);
      },
    },
    {
      label: tr("offline.step.congregations", "Congregações"),
      run: async () => {
        const data = await fetchTable(
          "congregations",
          (q) =>
            role === "superintendent"
              ? q.select("*").eq("superintendent_id", userId)
              : q.select("*"),
        );
        set(["offline", "congregations", userId], data);
      },
    },
    {
      label: tr("offline.step.visits", "Visitas"),
      run: async () => {
        const data = await fetchTable<{ id: string }>("visits", (q) => q.select("*"));
        visitIds.push(...data.map((v) => v.id));
        set(["offline", "visits", userId], data);
      },
    },
    {
      label: tr("offline.step.schedule", "Cronograma"),
      run: async () => {
        if (visitIds.length === 0) return;
        const data = await fetchTable("schedule_events", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "schedule_events", userId], data);
      },
    },
    {
      label: tr("offline.step.meals", "Refeições"),
      run: async () => {
        if (visitIds.length === 0) return;
        const meals = await fetchTable("meals", (q) => q.select("*").in("visit_id", visitIds));
        const notes = await fetchTable("meal_day_notes", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "meals", userId], meals);
        set(["offline", "meal_day_notes", userId], notes);
      },
    },
    {
      label: tr("offline.step.field", "Estudos e revisitas"),
      run: async () => {
        if (visitIds.length === 0) return;
        const fa = await fetchTable("field_assignments", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        const fm = await fetchTable("field_meetings", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "field_assignments", userId], fa);
        set(["offline", "field_meetings", userId], fm);
      },
    },
    {
      label: tr("offline.step.transport", "Transporte"),
      run: async () => {
        if (visitIds.length === 0) return;
        const data = await fetchTable("transport_schedule", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "transport_schedule", userId], data);
      },
    },
    {
      label: tr("offline.step.checklist", "Checklist"),
      run: async () => {
        if (visitIds.length === 0) return;
        const data = await fetchTable("checklist_items", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "checklist_items", userId], data);
      },
    },
    {
      label: tr("offline.step.meetings", "Reuniões e discursos"),
      run: async () => {
        if (visitIds.length === 0) return;
        const [midweek, weekend, pioneer, elders] = await Promise.all([
          fetchTable("midweek_meetings", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("weekend_meetings", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("pioneer_meetings", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("elders_servants_meetings", (q) => q.select("*").in("visit_id", visitIds)),
        ]);
        set(["offline", "midweek_meetings", userId], midweek);
        set(["offline", "weekend_meetings", userId], weekend);
        set(["offline", "pioneer_meetings", userId], pioneer);
        set(["offline", "elders_servants_meetings", userId], elders);
      },
    },
    {
      label: tr("offline.step.circuit", "Eventos do circuito"),
      run: async () => {
        const data = await fetchTable("circuit_schedule_events", (q) => q.select("*"));
        set(["offline", "circuit_schedule_events", userId], data);
      },
    },
    {
      label: tr("offline.step.templatesProgram", "Modelos de programação"),
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("program_templates", (q) => q.select("*"));
        templateIds.program.push(...tpls.map((x) => x.id));
        set(["offline", "program_templates", userId], tpls);
        if (templateIds.program.length) {
          const items = await fetchTable("program_template_items", (q) =>
            q.select("*").in("template_id", templateIds.program),
          );
          set(["offline", "program_template_items", userId], items);
        }
      },
    },
    {
      label: tr("offline.step.templatesChecklist", "Modelos de checklist"),
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("checklist_templates", (q) => q.select("*"));
        templateIds.checklist.push(...tpls.map((x) => x.id));
        set(["offline", "checklist_templates", userId], tpls);
        if (templateIds.checklist.length) {
          const items = await fetchTable("checklist_template_items", (q) =>
            q.select("*").in("template_id", templateIds.checklist),
          );
          set(["offline", "checklist_template_items", userId], items);
        }
      },
    },
    {
      label: tr("offline.step.templatesFieldMeeting", "Modelos de reuniões de campo"),
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("field_meeting_templates", (q) =>
          q.select("*"),
        );
        templateIds.fieldMeeting.push(...tpls.map((x) => x.id));
        set(["offline", "field_meeting_templates", userId], tpls);
        if (templateIds.fieldMeeting.length) {
          const items = await fetchTable("field_meeting_template_items", (q) =>
            q.select("*").in("template_id", templateIds.fieldMeeting),
          );
          set(["offline", "field_meeting_template_items", userId], items);
        }
      },
    },
    {
      label: tr("offline.step.templatesTalk", "Modelos de reunião e discursos"),
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("meeting_talk_templates", (q) =>
          q.select("*"),
        );
        templateIds.talk.push(...tpls.map((x) => x.id));
        set(["offline", "meeting_talk_templates", userId], tpls);
        if (templateIds.talk.length) {
          const [midweek, pioneer, elders, weekend] = await Promise.all([
            fetchTable("meeting_talk_template_midweek", (q) =>
              q.select("*").in("template_id", templateIds.talk),
            ),
            fetchTable("meeting_talk_template_pioneer", (q) =>
              q.select("*").in("template_id", templateIds.talk),
            ),
            fetchTable("meeting_talk_template_elders", (q) =>
              q.select("*").in("template_id", templateIds.talk),
            ),
            fetchTable("meeting_talk_template_weekend_themes", (q) =>
              q.select("*").in("template_id", templateIds.talk),
            ),
          ]);
          set(["offline", "meeting_talk_template_midweek", userId], midweek);
          set(["offline", "meeting_talk_template_pioneer", userId], pioneer);
          set(["offline", "meeting_talk_template_elders", userId], elders);
          set(["offline", "meeting_talk_template_weekend_themes", userId], weekend);
        }
      },
    },
    {
      label: tr("offline.step.talkThemes", "Temas de discurso"),
      run: async () => {
        const data = await fetchTable("talk_themes", (q) => q.select("*"));
        set(["offline", "talk_themes", userId], data);
      },
    },
    {
      label: tr("offline.step.notes", "Notas privadas"),
      run: async () => {
        if (role !== "superintendent") return;
        const data = await fetchTable("private_notes", (q) =>
          q.select("*").eq("superintendent_id", userId),
        );
        set(["offline", "private_notes", userId], data);
      },
    },
    {
      label: tr("offline.step.shells", "Telas do aplicativo"),
      run: async () => {
        await prefetchRouteShells({ signal });
      },
    },
  ];

  let completed = 0;
  let errors = 0;
  const total = steps.length;
  // Marca início para o usuário ver progresso imediato.
  onProgress?.({ step: 0, total, label: tr("offline.step.starting", "Iniciando…"), errors: 0 });

  for (const [i, step] of steps.entries()) {
    if (signal?.aborted) {
      return { completed, errors, aborted: true };
    }
    onProgress?.({ step: i, total, label: step.label, errors });
    try {
      await step.run();
      completed++;
    } catch (err) {
      errors++;
      console.warn(`[offline-prefetch] passo "${step.label}" falhou:`, err);
    }
    onProgress?.({ step: i + 1, total, label: step.label, errors });
    // Suspende brevemente para liberar o thread (UI fluida).
    await new Promise((r) => setTimeout(r, 10));
  }

  // Marca timestamp da última pré-carga bem-sucedida (mesmo que parcial).
  if (completed > 0 && typeof window !== "undefined") {
    try {
      localStorage.setItem(OFFLINE_READY_KEY, String(Date.now()));
    } catch {
      /* quota */
    }
  }
  // Garante a persistência imediata do cache (sem esperar o throttle).
  try {
    await queryClient.getQueryCache().getAll(); // touch
  } catch {
    /* noop */
  }

  return { completed, errors, aborted: false };
}

export function getOfflineReadyAt(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(OFFLINE_READY_KEY);
  return v ? Number(v) : null;
}
