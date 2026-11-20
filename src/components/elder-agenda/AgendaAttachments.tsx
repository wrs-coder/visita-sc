// Anexos de um cartão: foto/PDF ficam no aparelho; o SC liga "Enviar" para os anciãos verem.
import { useState } from "react";
import { toast } from "sonner";
import { FileText, ImageIcon, Link2, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { pickFile } from "@/lib/share";
import { viewerStore } from "./attachment-viewer-store";
import { newId, safeUrl, type AgendaAttachment, type AgendaCard } from "@/lib/elder-agenda/agenda";
import { dropLocal, keepLocal, localBlob, prepareFile } from "./agenda-attachments";
import { openAllLinks } from "./open-all-links";

export interface AgendaAttachmentApi {
  urlFor: (path: string) => Promise<string | null>;
  upload?: (blob: Blob, ext: "jpg" | "pdf") => Promise<{ path?: string; error?: string }>;
  remove?: (path: string) => Promise<void>;
}

const ICON = { photo: ImageIcon, pdf: FileText, link: Link2 } as const;

export function AgendaAttachments({ card, editable, api, onChange, offline }: {
  card: AgendaCard; editable: boolean; api?: AgendaAttachmentApi; offline: boolean;
  onChange: (attachments: AgendaAttachment[]) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const isPrivate = card.type === "private";
  const list = editable ? card.attachments : card.attachments.filter((a) => a.kind === "link" || a.cloudPath);
  if (!editable && !list.length) return null;

  const set = (id: string, next: Partial<AgendaAttachment>) => onChange(card.attachments.map((a) => (a.id === id ? { ...a, ...next } : a)));

  const blobOf = async (a: AgendaAttachment): Promise<Blob | null> => {
    const local = await localBlob(a.id);
    if (local) return local;
    if (!a.cloudPath || !api) return null;
    const url = await api.urlFor(a.cloudPath);
    if (!url) return null;
    const res = await fetch(url); if (!res.ok) return null;
    const b = await res.blob();
    // Anciãos só visualizam: nada fica guardado no aparelho. O SC mantém a cópia como antes.
    if (editable) await keepLocal(a.id, b);
    return b;
  };
  const open = async (a: AgendaAttachment) => {
    if (a.kind === "link") { void openAllLinks([a.url]); return; }
    setBusy(a.id);
    try {
      const b = await blobOf(a);
      if (!b) { toast.error(a.cloudPath ? "Sem internet para baixar este anexo." : "Este anexo está só no aparelho onde foi adicionado."); return; }
      viewerStore.open({ id: a.id, title: a.title, kind: a.kind, blob: b });
    } catch { toast.error("Não foi possível abrir o anexo."); } finally { setBusy(null); }
  };
  const add = async (kind: "photo" | "pdf") => {
    const f = await pickFile(kind === "photo" ? "image/*" : "application/pdf,.pdf");
    if (!f) return;
    const r = await prepareFile(f);
    if ("error" in r) { toast.error(r.error); return; }
    onChange([...card.attachments, r.att]);
  };
  const addLink = () => {
    const url = safeUrl(prompt("Cole o link (vídeo, publicação…)") ?? "");
    if (!url) return;
    onChange([...card.attachments, { id: newId(), kind: "link", title: url.replace(/^https?:\/\//, "").slice(0, 80), url, cloudPath: "", size: 0 }]);
  };
  const toggleSend = async (a: AgendaAttachment, on: boolean) => {
    if (!api?.upload || !api.remove) return;
    setBusy(a.id);
    try {
      if (on) {
        const b = await localBlob(a.id);
        if (!b) { toast.error("O arquivo não está neste aparelho."); return; }
        const r = await api.upload(b, a.kind === "pdf" ? "pdf" : "jpg");
        if (!r.path) { toast.error(r.error ?? "Não foi possível enviar."); return; }
        set(a.id, { cloudPath: r.path, size: b.size });
        toast.success("Enviado. Toque em Salvar para os anciãos verem.");
      } else {
        if (a.cloudPath) await api.remove(a.cloudPath);
        set(a.id, { cloudPath: "" });
      }
    } catch { toast.error("Sem conexão."); } finally { setBusy(null); }
  };
  const remove = async (a: AgendaAttachment) => {
    if (!confirm(`Tirar o anexo "${a.title}"?`)) return;
    if (a.cloudPath && api?.remove) { try { await api.remove(a.cloudPath); } catch { /* limpa depois de 30 dias */ } }
    await dropLocal(a.id);
    onChange(card.attachments.filter((x) => x.id !== a.id));
  };

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="h-3.5 w-3.5" />Anexos</p>
      {list.map((a) => {
        const Icon = ICON[a.kind];
        return (
          <div key={a.id} className="flex items-center gap-2 rounded-xl border px-2.5 py-2 min-w-0">
            <button type="button" onClick={() => void open(a)} className="flex flex-1 items-center gap-2 min-w-0 text-left">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Icon className="h-4 w-4 text-primary" />}
              </span>
              <span className="min-w-0 text-sm break-words">{a.title}</span>
            </button>
            {editable && a.kind !== "link" && !isPrivate ? (
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                Enviar
                <Switch checked={!!a.cloudPath} disabled={offline || busy === a.id || !api?.upload} onCheckedChange={(v) => void toggleSend(a, v)} aria-label="Enviar aos anciãos" />
              </label>
            ) : null}
            {editable ? <button type="button" onClick={() => void remove(a)} aria-label="Tirar anexo" className="p-1.5 text-muted-foreground shrink-0"><Trash2 className="h-4 w-4" /></button> : null}
          </div>
        );
      })}
      {editable ? (
        <div className="flex flex-wrap gap-3 pt-0.5">
          {([["photo", "Foto"], ["pdf", "PDF"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => void add(k)} className="text-primary text-sm font-medium inline-flex items-center gap-1"><Plus className="h-4 w-4" />{l}</button>
          ))}
          <button type="button" onClick={addLink} className="text-primary text-sm font-medium inline-flex items-center gap-1"><Plus className="h-4 w-4" />Link</button>
        </div>
      ) : null}
      {editable && !isPrivate && card.attachments.some((a) => a.kind !== "link" && !a.cloudPath) ? (
        <p className="text-[11px] text-muted-foreground">Fotos e PDF ficam só neste aparelho até você ligar "Enviar".</p>
      ) : null}
    </div>
  );
}
