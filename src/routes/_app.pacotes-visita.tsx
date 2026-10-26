import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Download, MoreVertical, Package, Pencil, Plus, Trash2, Upload, Copy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listTemplates } from "@/lib/templates.functions";
import { listChecklistTemplates } from "@/lib/checklist-templates.functions";
import { listFieldMeetingTemplates } from "@/lib/field-meeting-templates.functions";
import { listMeetingTalkTemplates } from "@/lib/meeting-talk-templates.functions";
import { listElderProgramTemplates } from "@/lib/elder-program-templates.functions";
import { TemplatesTabs } from "@/components/templates/TemplatesTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PACKAGE_FIELDS, isPackage, loadPackages, missingFields, fetchPackages, pushPackages,
  type PackageField, type VisitPackage,
} from "@/lib/visit-packages";

export const Route = createFileRoute("/_app/pacotes-visita")({
  head: () => ({
    meta: [
      { title: "Pacotes da visita — Visita SC" },
      { name: "description", content: "Combine os cinco modelos da visita em um pacote e aplique tudo de uma vez no itinerário." },
      { property: "og:title", content: "Pacotes da visita — Visita SC" },
      { property: "og:description", content: "Combine os cinco modelos da visita em um pacote." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Opt = { id: string; name: string };
const FIELD_LABEL: Record<PackageField, string> = {
  template_id: "Programação",
  checklist_template_id: "Checklist",
  field_template_id: "Reuniões de campo",
  meeting_talk_template_id: "Reuniões e discursos",
  elder_program_template_id: "Anciãos",
};

const pickList = (r: unknown): Opt[] =>
  ((r as { ok?: boolean; templates?: Opt[] })?.ok ? (r as { templates?: Opt[] }).templates ?? [] : []).map((t) => ({ id: t.id, name: t.name }));

function useAllTemplateOptions(enabled: boolean) {
  const f1 = useServerFn(listTemplates);
  const f2 = useServerFn(listChecklistTemplates);
  const f3 = useServerFn(listFieldMeetingTemplates);
  const f4 = useServerFn(listMeetingTalkTemplates);
  const f5 = useServerFn(listElderProgramTemplates);
  const [opts, setOpts] = useState<Record<PackageField, Opt[]>>({
    template_id: [], checklist_template_id: [], field_template_id: [], meeting_talk_template_id: [], elder_program_template_id: [],
  });
  useEffect(() => {
    if (!enabled) return;
    Promise.all([f1(), f2(), f3(), f4(), f5()]).then(([a, b, c, d, e]) => setOpts({
      template_id: pickList(a), checklist_template_id: pickList(b), field_template_id: pickList(c),
      meeting_talk_template_id: pickList(d), elder_program_template_id: pickList(e),
    })).catch(() => undefined);
  }, [enabled, f1, f2, f3, f4, f5]);
  return opts;
}

const emptyPkg = (): VisitPackage => ({
  id: crypto.randomUUID(), name: "",
  template_id: "", checklist_template_id: "", field_template_id: "", meeting_talk_template_id: "", elder_program_template_id: "",
});

function Page() {
  const { role, user } = useAuth();
  const isSuper = role === "superintendent";
  const opts = useAllTemplateOptions(isSuper);
  const [list, setList] = useState<VisitPackage[]>([]);
  const [edit, setEdit] = useState<VisitPackage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    setList(loadPackages(user?.id));
    fetchPackages(user?.id).then((l) => { if (alive) setList(l); });
    return () => { alive = false; };
  }, [user?.id]);
  const persist = useCallback((next: VisitPackage[]) => {
    setList((prev) => {
      pushPackages(user?.id, prev, next).then((ok) => { if (!ok) toast.message("Pacote salvo neste aparelho. Ele será enviado quando houver internet."); });
      return next;
    });
  }, [user?.id]);

  const available = useMemo(
    () => Object.fromEntries(PACKAGE_FIELDS.map((f) => [f, opts[f].map((o) => o.id)])) as Record<PackageField, string[]>,
    [opts],
  );
  const nameOf = (f: PackageField, id: string) => opts[f].find((o) => o.id === id)?.name;

  if (!isSuper) return <Card><CardContent className="p-6 text-sm">Apenas o superintendente pode gerenciar modelos.</CardContent></Card>;

  const saveEdit = () => {
    if (!edit) return;
    if (!edit.name.trim()) { toast.error("Dê um nome ao pacote."); return; }
    const exists = list.some((p) => p.id === edit.id);
    persist(exists ? list.map((p) => (p.id === edit.id ? edit : p)) : [...list, edit]);
    setEdit(null);
    toast.success("Pacote salvo.");
  };

  const exportPkg = (p: VisitPackage) => {
    const blob = new Blob([JSON.stringify({ kind: "visita-sc-package", version: 1, package: p }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pacote-${p.name.replace(/[^\w-]+/g, "_") || "visita"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file: File) => {
    try {
      if (file.size > 50_000) throw new Error();
      const data = JSON.parse(await file.text());
      const p = data?.package;
      if (data?.kind !== "visita-sc-package" || !isPackage(p)) throw new Error();
      persist([...list, { ...p, id: crypto.randomUUID(), name: p.name.slice(0, 80) }]);
      toast.success("Pacote importado.");
    } catch {
      toast.error("Arquivo de pacote inválido.");
    }
  };

  return (
    <div className="space-y-5">
      <TemplatesTabs />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Pacotes da visita</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Importar</Button>
          <Button size="sm" onClick={() => setEdit(emptyPkg())}><Plus className="h-4 w-4 mr-1" />Novo</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
        </div>
      </div>

      {list.length === 0 && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">
          Nenhum pacote ainda. Crie um para escolher os 5 modelos de uma vez ao cadastrar uma visita.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {list.map((p) => {
          const missing = missingFields(p, available);
          return (
            <Card key={p.id} className="shadow-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <div className="font-semibold flex-1 truncate">{p.name}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Opções do pacote"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEdit({ ...p })}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => persist([...list, { ...p, id: crypto.randomUUID(), name: `${p.name} (cópia)` }])}><Copy className="h-4 w-4 mr-2" />Duplicar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportPkg(p)}><Download className="h-4 w-4 mr-2" />Exportar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => persist(list.filter((x) => x.id !== p.id))}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {PACKAGE_FIELDS.map((f) => (
                    <div key={f} className="contents">
                      <dt className="text-xs text-muted-foreground self-center">{FIELD_LABEL[f]}</dt>
                      <dd className="truncate">{nameOf(f, p[f]) ?? <span className="text-muted-foreground italic">(vazio)</span>}</dd>
                    </div>
                  ))}
                </dl>
                {missing.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-foreground bg-warning/15 border border-warning/40 rounded-md px-2 py-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {missing.length === 1 ? "1 modelo não encontrado" : `${missing.length} modelos não encontrados`}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">Guardado só neste aparelho · use Exportar para levar a outro.</p>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit && list.some((p) => p.id === edit.id) ? "Editar pacote" : "Novo pacote"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div>
                <Label>Nome do pacote</Label>
                <Input className="mt-1" maxLength={80} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>
              {PACKAGE_FIELDS.map((f) => (
                <div key={f}>
                  <Label>{FIELD_LABEL[f]}</Label>
                  <Select value={edit[f] || undefined} onValueChange={(v) => setEdit({ ...edit, [f]: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>{opts[f].map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
