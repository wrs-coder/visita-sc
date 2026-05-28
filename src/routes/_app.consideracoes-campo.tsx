import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Plus, Trash2, Search, Save, Languages } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SavingIndicator } from "@/components/SavingIndicator";
import { BibleManagerDialog } from "@/components/bible/BibleManagerDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  listNotes,
  saveNote as persistNote,
  deleteNote as removeNote,
  newNoteId,
  ensureSeed,
  getLangStatus,
  type FieldNote,
  type BibleLangStatus,
} from "@/lib/bible-notes-store";
import type { BibleLang } from "@/lib/bible-refs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/consideracoes-campo")({
  beforeLoad: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isSuper = (roles ?? []).some((r) => r.role === "superintendent");
      if (!isSuper) throw redirect({ to: "/dashboard" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: Page,
});

function emptyNote(): FieldNote {
  const now = Date.now();
  return {
    id: newNoteId(),
    title: "",
    prayer: "",
    territory: "",
    assistants: "",
    content: "",
    created_at: now,
    updated_at: now,
  };
}

function Page() {
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FieldNote | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Initial load.
  useEffect(() => {
    listNotes().then((all) => {
      const sorted = all.sort((a, b) => b.updated_at - a.updated_at);
      setNotes(sorted);
      if (sorted.length > 0) {
        setSelectedId(sorted[0].id);
        setDraft(sorted[0]);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => (n.title || "").toLowerCase().includes(q));
  }, [notes, query]);

  function selectNote(n: FieldNote) {
    setSelectedId(n.id);
    setDraft(n);
  }

  function handleNew() {
    const n = emptyNote();
    setDraft(n);
    setSelectedId(n.id);
  }

  function patch<K extends keyof FieldNote>(key: K, value: FieldNote[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    const updated: FieldNote = { ...draft, updated_at: Date.now() };
    try {
      await persistNote(updated);
      setNotes((all) => {
        const idx = all.findIndex((n) => n.id === updated.id);
        const next = idx >= 0 ? [...all] : [updated, ...all];
        if (idx >= 0) next[idx] = updated;
        return next.sort((a, b) => b.updated_at - a.updated_at);
      });
      setDraft(updated);
      toast.success(t("fieldConsiderations.saved"));
    } catch {
      toast.error(t("common.errorGeneric", { defaultValue: "Erro" }));
    } finally {
      // small delay so SavingIndicator shows "Salvo"
      setTimeout(() => setSaving(false), 300);
    }
  }

  async function handleDelete() {
    if (!draft) return;
    if (!confirm(t("fieldConsiderations.deleteConfirm"))) return;
    await removeNote(draft.id);
    const remaining = notes.filter((n) => n.id !== draft.id);
    setNotes(remaining);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
      setDraft(remaining[0]);
    } else {
      setSelectedId(null);
      setDraft(null);
    }
    toast.success(t("fieldConsiderations.deleted"));
  }

  const dateFmt = (ts: number) =>
    new Date(ts).toLocaleDateString(i18n.language, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{t("fieldConsiderations.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("fieldConsiderations.subtitle")}</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <Card className="h-fit">
          <CardContent className="p-3 space-y-3">
            <Button onClick={handleNew} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> {t("fieldConsiderations.newNote")}
            </Button>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("fieldConsiderations.search")}
                className="pl-7 h-9"
              />
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("fieldConsiderations.empty")}
                </p>
              )}
              {filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => selectNote(n)}
                  className={cn(
                    "w-full text-left rounded-lg px-2.5 py-2 text-sm transition",
                    selectedId === n.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <div className="font-medium truncate">
                    {n.title || t("fieldConsiderations.fields.title")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {dateFmt(n.updated_at)}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardContent className="p-5 space-y-4">
            {!draft ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {t("fieldConsiderations.noSelection")}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-muted-foreground">
                    {t("fieldConsiderations.updatedAt")}: {dateFmt(draft.updated_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    <SavingIndicator saving={saving} />
                    <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-1.5" /> {t("fieldConsiderations.delete")}
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-1.5" /> {t("fieldConsiderations.save")}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>{t("fieldConsiderations.fields.title")}</Label>
                    <Input
                      value={draft.title}
                      onChange={(e) => patch("title", e.target.value)}
                      placeholder={t("fieldConsiderations.fields.titlePh")}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label>{t("fieldConsiderations.fields.prayer")}</Label>
                      <Input
                        value={draft.prayer}
                        onChange={(e) => patch("prayer", e.target.value)}
                        placeholder={t("fieldConsiderations.fields.prayerPh")}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>{t("fieldConsiderations.fields.territory")}</Label>
                      <Input
                        value={draft.territory}
                        onChange={(e) => patch("territory", e.target.value)}
                        placeholder={t("fieldConsiderations.fields.territoryPh")}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("fieldConsiderations.fields.assistants")}</Label>
                    <Input
                      value={draft.assistants}
                      onChange={(e) => patch("assistants", e.target.value)}
                      placeholder={t("fieldConsiderations.fields.assistantsPh")}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("fieldConsiderations.fields.content")}</Label>
                    <Textarea
                      value={draft.content}
                      onChange={(e) => patch("content", e.target.value)}
                      placeholder={t("fieldConsiderations.fields.contentPh")}
                      rows={12}
                      className="resize-y min-h-[240px]"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
