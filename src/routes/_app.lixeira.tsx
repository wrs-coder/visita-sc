import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, RotateCcw, ArrowLeft, AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import {
  listTrashedOutlines,
  restoreOutline,
  deleteCloudOutline,
} from "@/lib/personal-outlines.functions";
import {
  listTrashedNotes as listTrashedPrivateNotes,
  restoreNote as restorePrivateNote,
  purgeNote as purgePrivateNote,
  emptyNotesTrash,
} from "@/lib/private-notes.functions";
import {
  listTrashedNotes as listTrashedLocalNotes,
  listTrashedFolders,
  restoreNote as restoreLocalNote,
  restoreFolder as restoreLocalFolder,
  hardDeleteNote as hardDeleteLocalNote,
  hardDeleteFolder as hardDeleteLocalFolder,
  type FieldNote,
  type NoteFolder,
} from "@/lib/bible-notes-store";

export const Route = createFileRoute("/_app/lixeira")({ component: Page });

type CloudOutline = { id: string; title: string; folder_path: string; updated_at: string; deleted_at: string | null };
type PrivateNoteTrash = { id: string; title: string | null; note_type: string; updated_at: string; deleted_at: string | null };

function daysLeft(deletedAt: string | number | null | undefined): number {
  if (!deletedAt) return 30;
  const d = typeof deletedAt === "string" ? new Date(deletedAt).getTime() : deletedAt;
  const elapsed = Date.now() - d;
  return Math.max(0, 30 - Math.floor(elapsed / (24 * 60 * 60 * 1000)));
}

function Page() {
  const { t } = useTranslation();
  const fnListOutlines = useServerFn(listTrashedOutlines);
  const fnRestoreOutline = useServerFn(restoreOutline);
  const fnPurgeOutline = useServerFn(deleteCloudOutline);
  const fnListNotes = useServerFn(listTrashedPrivateNotes);
  const fnRestoreNote = useServerFn(restorePrivateNote);
  const fnPurgeNote = useServerFn(purgePrivateNote);
  const fnEmptyNotes = useServerFn(emptyNotesTrash);

  const [outlines, setOutlines] = useState<CloudOutline[]>([]);
  const [notes, setNotes] = useState<PrivateNoteTrash[]>([]);
  const [localNotes, setLocalNotes] = useState<FieldNote[]>([]);
  const [localFolders, setLocalFolders] = useState<NoteFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [o, n, ln, lf] = await Promise.all([
      fnListOutlines().catch(() => ({ ok: false as const, error: "" })),
      fnListNotes().catch(() => ({ ok: false as const, error: "" })),
      listTrashedLocalNotes(),
      listTrashedFolders(),
    ]);
    if (o.ok) setOutlines(o.outlines as CloudOutline[]);
    if (n.ok) setNotes(n.notes as PrivateNoteTrash[]);
    setLocalNotes(ln);
    setLocalFolders(lf);
    setLoading(false);
  }, [fnListOutlines, fnListNotes]);

  useEffect(() => { void refresh(); }, [refresh]);

  // ---- Esboços (nuvem) ----
  async function restoreOutlineCloud(id: string) {
    const r = await fnRestoreOutline({ data: { id } });
    if (r.ok) { toast.success(t("trash.restored", { defaultValue: "Restaurado." })); void refresh(); }
    else toast.error(r.error);
  }
  async function purgeOutlineCloud(id: string) {
    if (!confirm(t("trash.purgeConfirm", { defaultValue: "Apagar definitivamente? Esta ação não pode ser desfeita." }))) return;
    const r = await fnPurgeOutline({ data: { id } });
    if (r.ok) { toast.success(t("trash.purged", { defaultValue: "Apagado definitivamente." })); void refresh(); }
    else toast.error(r.error);
  }

  // ---- Notas privadas ----
  async function restoreNoteCloud(id: string) {
    const r = await fnRestoreNote({ data: { id } });
    if (r.ok) { toast.success(t("trash.restored", { defaultValue: "Restaurado." })); void refresh(); }
    else toast.error(r.error);
  }
  async function purgeNoteCloud(id: string) {
    if (!confirm(t("trash.purgeConfirm", { defaultValue: "Apagar definitivamente? Esta ação não pode ser desfeita." }))) return;
    const r = await fnPurgeNote({ data: { id } });
    if (r.ok) { toast.success(t("trash.purged", { defaultValue: "Apagado definitivamente." })); void refresh(); }
    else toast.error(r.error);
  }
  async function emptyAllNotes() {
    if (!confirm(t("trash.emptyConfirm", { defaultValue: "Esvaziar toda a lixeira de notas? Esta ação é definitiva." }))) return;
    const r = await fnEmptyNotes();
    if (r.ok) { toast.success(t("trash.emptied", { defaultValue: "Lixeira esvaziada." })); void refresh(); }
    else toast.error(r.error);
  }

  // ---- Locais ----
  async function restoreLocal(id: string) {
    await restoreLocalNote(id);
    toast.success(t("trash.restored", { defaultValue: "Restaurado." }));
    void refresh();
  }
  async function purgeLocal(id: string) {
    if (!confirm(t("trash.purgeConfirm", { defaultValue: "Apagar definitivamente?" }))) return;
    await hardDeleteLocalNote(id);
    toast.success(t("trash.purged", { defaultValue: "Apagado definitivamente." }));
    void refresh();
  }
  async function restoreLocalFolderFn(id: string) {
    await restoreLocalFolder(id);
    toast.success(t("trash.restored", { defaultValue: "Restaurado." }));
    void refresh();
  }
  async function purgeLocalFolderFn(id: string) {
    if (!confirm(t("trash.purgeConfirm", { defaultValue: "Apagar definitivamente?" }))) return;
    await hardDeleteLocalFolder(id);
    toast.success(t("trash.purged", { defaultValue: "Apagado definitivamente." }));
    void refresh();
  }

  const totalCount = outlines.length + notes.length + localNotes.length + localFolders.length;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            {t("trash.title", { defaultValue: "Lixeira" })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("trash.retentionInfo", { defaultValue: "Itens são apagados definitivamente após 30 dias." })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/configuracoes">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("common.back", { defaultValue: "Voltar" })}
          </Link>
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">{t("common.loading")}</CardContent></Card>
      ) : totalCount === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("trash.empty", { defaultValue: "A lixeira está vazia." })}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="outlines" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="outlines">
              {t("trash.outlinesTab", { defaultValue: "Esboços" })} ({outlines.length})
            </TabsTrigger>
            <TabsTrigger value="notes">
              {t("trash.notesTab", { defaultValue: "Notas privadas" })} ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="local">
              {t("trash.localTab", { defaultValue: "Local" })} ({localNotes.length + localFolders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outlines" className="mt-4 space-y-2 list-optimized-sm">
            {outlines.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">{t("trash.empty")}</CardContent></Card>
            ) : outlines.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.title || t("personalOutlines.untitled", { defaultValue: "Sem título" })}</p>
                    <span className="status-badge mt-1" data-tone={daysLeft(o.deleted_at) <= 7 ? "attention" : "pending"}>
                      {t("trash.daysLeft", { defaultValue: "Expira em {{n}} dias", n: daysLeft(o.deleted_at) })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => restoreOutlineCloud(o.id)}>
                      <RotateCcw className="h-4 w-4 mr-1" />{t("trash.restore", { defaultValue: "Restaurar" })}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => purgeOutlineCloud(o.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-2 list-optimized-sm">
            {notes.length > 0 && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={emptyAllNotes}>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {t("trash.emptyAll", { defaultValue: "Esvaziar tudo" })}
                </Button>
              </div>
            )}
            {notes.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">{t("trash.empty")}</CardContent></Card>
            ) : notes.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{n.title || t("notes.untitled", { defaultValue: "Sem título" })}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{n.note_type}</span>
                      <span className="status-badge" data-tone={daysLeft(n.deleted_at) <= 7 ? "attention" : "pending"}>
                        {t("trash.daysLeft", { defaultValue: "Expira em {{n}} dias", n: daysLeft(n.deleted_at) })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => restoreNoteCloud(n.id)}>
                      <RotateCcw className="h-4 w-4 mr-1" />{t("trash.restore", { defaultValue: "Restaurar" })}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => purgeNoteCloud(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="local" className="mt-4 space-y-2 list-optimized-sm">
            {localFolders.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">📁 {f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("trash.daysLeft", { defaultValue: "Expira em {{n}} dias", n: daysLeft(f.deleted_at ?? null) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => restoreLocalFolderFn(f.id)}>
                      <RotateCcw className="h-4 w-4 mr-1" />{t("trash.restore", { defaultValue: "Restaurar" })}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => purgeLocalFolderFn(f.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {localNotes.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{n.title || t("personalOutlines.untitled", { defaultValue: "Sem título" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("trash.daysLeft", { defaultValue: "Expira em {{n}} dias", n: daysLeft(n.deleted_at ?? null) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => restoreLocal(n.id)}>
                      <RotateCcw className="h-4 w-4 mr-1" />{t("trash.restore", { defaultValue: "Restaurar" })}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => purgeLocal(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {localNotes.length === 0 && localFolders.length === 0 && (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">{t("trash.empty")}</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
