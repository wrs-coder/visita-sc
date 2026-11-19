// Ponte da pauta com as Notas privadas do SC (mesma tabela e gravação offline da tela de Notas).
// "Não designar" cria/atualiza a nota em Recomendados; "Sincronizar" lê a S-303 da semana da visita.
import { supabase } from "@/integrations/supabase/client";
import { readWithMirror } from "@/lib/local-first";
import { offlineInsert, offlineUpdate } from "@/lib/local-write";
import { htmlToPlain, s303Html, weekOf, type AgendaAutoRec } from "./agenda";

type NoteRow = { id: string; congregation_id: string | null; note_type: string; note_date: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null; payload: Record<string, string> | null; title: string | null };

async function notesOf(congregationId: string, type: string): Promise<NoteRow[]> {
  const res = await readWithMirror<Record<string, unknown>>({
    table: "private_notes",
    remote: () => supabase.from("private_notes").select("*").eq("congregation_id", congregationId).eq("note_type", type).is("deleted_at", null) as never,
    filter: (r) => r.congregation_id === congregationId && r.note_type === type && !r.deleted_at,
  });
  return res.rows as unknown as NoteRow[];
}
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/** Cria ou atualiza a nota "Recomendados" do irmão com a decisão final da pauta. */
export async function upsertDeclineNote(opts: { congregationId: string; rec: AgendaAutoRec; commentHtml: string; family: string; fieldGroup: string; info: string }): Promise<"created" | "updated" | "queued"> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Entre na sua conta.");
  const name = opts.rec.name || opts.rec.title.split(" — ")[0] || "Recomendado";
  const corpo = [opts.family ? `Membros da família: ${opts.family}` : "", opts.fieldGroup ? `Grupo de campo: ${opts.fieldGroup}` : "", htmlToPlain(opts.info)].filter(Boolean).join("\n");
  const sup = [`Decisão na reunião com os anciãos: Não designar.`, htmlToPlain(opts.commentHtml)].filter(Boolean).join("\n");
  const existing = (await notesOf(opts.congregationId, "recomendados")).find((n) => norm(n.payload?.nome ?? n.title ?? "") === norm(name));
  if (existing) {
    const payload = { ...(existing.payload ?? {}), nome: name, tipo: opts.rec.purpose || existing.payload?.tipo || "", corpo: corpo || existing.payload?.corpo || "", super: sup };
    const { error, queued } = await offlineUpdate("private_notes", { payload } as Record<string, unknown>, { id: existing.id });
    if (error) throw new Error(error.message);
    return queued ? "queued" : "updated";
  }
  const id = crypto.randomUUID();
  const { error, queued } = await offlineInsert("private_notes", {
    id, congregation_id: opts.congregationId, superintendent_id: u.user.id, note_type: "recomendados", title: name, content: "",
    payload: { nome: name, tipo: opts.rec.purpose ?? "", corpo, super: sup },
  } as Record<string, unknown>);
  if (error) throw new Error(error.message);
  return queued ? "queued" : "created";
}

/** S-303 da congregação com data na semana da visita, já em HTML (ordem fixa). null = nada encontrado. */
export async function s303ForWeek(congregationId: string, visitStart: string): Promise<string | null> {
  const { from, to } = weekOf(visitStart);
  const day = (n: NoteRow) => (n.note_date || n.created_at || n.updated_at || "").slice(0, 10);
  const hits = (await notesOf(congregationId, "s303")).filter((n) => { const d = day(n); return d >= from && d <= to; })
    .sort((a, b) => day(b).localeCompare(day(a)));
  for (const n of hits) { const html = s303Html(n.payload ?? {}); if (html) return html; }
  return null;
}
