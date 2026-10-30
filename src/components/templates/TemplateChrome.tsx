/**
 * Peças visuais compartilhadas das telas de modelos: seletor compacto no
 * celular, menu ⋮ de ações, linha recolhível e barra fixa no rodapé.
 * Somente apresentação: os handlers recebidos continuam os mesmos de antes.
 */
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Copy, Plus, Download, Loader2, MoreHorizontal, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { shareJsonFile, readJsonFile, pickFile } from "@/lib/share";
import { cn } from "@/lib/utils";

export interface TemplateIO {
  filenameBase: string;
  onExport: () => Promise<{ ok: boolean; file?: unknown; error?: string }>;
  onImport: (file: unknown) => Promise<{ ok: boolean; error?: string }>;
}

/** Exportar/Importar — mesma lógica do TemplateIOButtons. */
export function useTemplateIO(io?: TemplateIO) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<null | "export" | "import">(null);
  const doExport = async () => {
    if (!io) return;
    setBusy("export");
    const r = await io.onExport();
    setBusy(null);
    if (!r.ok || !r.file) { toast.error(r.error ?? t("templateIO.exportFail")); return; }
    const safe = io.filenameBase.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 60) || "modelo";
    const fname = `${safe}-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const result = await shareJsonFile(fname, r.file);
      toast.success(result === "shared" ? t("templateIO.shared") : t("templateIO.downloaded"));
    } catch (e) {
      toast.error(t("templateIO.shareFail"), { description: (e as Error).message });
    }
  };
  const doImport = async () => {
    if (!io) return;
    const f = await pickFile("application/json,.json,application/octet-stream");
    if (!f) return;
    setBusy("import");
    try {
      const json = await readJsonFile(f);
      const r = await io.onImport(json);
      if (!r.ok) toast.error(r.error ?? t("templateIO.importFail"));
      else toast.success(t("templateIO.imported"));
    } catch (e) {
      toast.error(t("templateIO.invalidFile"), { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };
  return { busy, doExport, doImport };
}

export function TemplateActionsMenu({
  onRename, onDuplicate, onDelete, duplicateDisabled, disabled, io, exportDisabled,
}: {
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  duplicateDisabled?: boolean;
  disabled?: boolean;
  exportDisabled?: boolean;
  io?: TemplateIO;
}) {
  const { t } = useTranslation();
  const { busy, doExport, doImport } = useTemplateIO(io);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full" aria-label={t("templates.chrome.actions", { defaultValue: "Ações do modelo" })}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl">
        {onRename && <DropdownMenuItem disabled={disabled} onSelect={onRename}><Pencil className="h-4 w-4 mr-2" />{t("common.rename", { defaultValue: "Renomear" })}</DropdownMenuItem>}
        {onDuplicate && <DropdownMenuItem disabled={disabled || duplicateDisabled} onSelect={onDuplicate}><Copy className="h-4 w-4 mr-2" />{t("common.duplicate", { defaultValue: "Duplicar" })}</DropdownMenuItem>}
        {io && (
          <>
            {(onRename || onDuplicate) && <DropdownMenuSeparator />}
            <DropdownMenuItem disabled={disabled || exportDisabled || busy !== null} onSelect={doExport}><Download className="h-4 w-4 mr-2" />{t("templateIO.export")}</DropdownMenuItem>
            <DropdownMenuItem disabled={disabled || busy !== null} onSelect={doImport}><Upload className="h-4 w-4 mr-2" />{t("templateIO.import")}</DropdownMenuItem>
          </>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={disabled} onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" />{t("common.delete", { defaultValue: "Excluir" })}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Seletor compacto de modelo — só no celular (no computador a lista fica ao lado). */
export function TemplatePicker({ items, activeId, onPick, placeholder }: {
  items: { id: string; name: string }[];
  activeId: string | null;
  onPick: (id: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <Select value={activeId ?? undefined} onValueChange={onPick}>
      <SelectTrigger className="h-10 flex-1 min-w-0 rounded-xl bg-muted/40 font-medium">
        <SelectValue placeholder={placeholder ?? t("templates.selectTemplate")} />
      </SelectTrigger>
      <SelectContent>
        {items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Linha recolhível estilo iOS/One UI; conteúdo fica oculto, nunca desmontado. */
export function InfoDisclosure({ label, filled, children, className }: { label: string; filled?: boolean; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-xl border bg-muted/20", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium"
      >
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {filled && !open && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
      </button>
      <div className={cn("px-3 pb-3 space-y-2", !open && "hidden")}>{children}</div>
    </div>
  );
}

/** Barra fixa no rodapé com Adicionar/Salvar. */
export function TemplateFooterBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-1 mt-2 flex items-center gap-2 rounded-t-2xl border-t bg-background/90 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-4px_16px_-8px_hsl(var(--foreground)/0.15)]">
      {children}
    </div>
  );
}

/** Pílula "+ Novo" com Novo modelo / Exportar / Importar. */
export function TemplateNewMenu({ onNew, newDisabled, io, exportDisabled }: {
  onNew: () => void; newDisabled?: boolean; io?: TemplateIO; exportDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const { busy, doExport, doImport } = useTemplateIO(io);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary" className="h-10 shrink-0 rounded-full px-3 gap-1 font-medium">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("templates.chrome.new", { defaultValue: "Novo" })}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 rounded-xl">
        <DropdownMenuItem disabled={newDisabled} onSelect={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          {newDisabled ? t("templates.chrome.limitReached", { defaultValue: "Limite de modelos atingido" }) : t("templates.chrome.newTemplate", { defaultValue: "Novo modelo" })}
        </DropdownMenuItem>
        {io && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={exportDisabled || busy !== null} onSelect={doExport}><Download className="h-4 w-4 mr-2" />{t("templateIO.export")}</DropdownMenuItem>
            <DropdownMenuItem disabled={busy !== null} onSelect={doImport}><Upload className="h-4 w-4 mr-2" />{t("templateIO.import")}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Linha única: + Novo · seletor · ⋮ (igual em todas as telas de modelos). */
export function TemplateHeaderRow({
  items, activeId, onPick, onNew, newDisabled, io, onRename, onDuplicate, onDelete, duplicateDisabled, disabled,
}: {
  items: { id: string; name: string }[];
  activeId: string | null;
  onPick: (id: string) => void;
  onNew: () => void;
  newDisabled?: boolean;
  io?: TemplateIO;
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  duplicateDisabled?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const hasActive = !!activeId && items.some((i) => i.id === activeId);
  return (
    <div className="flex items-center gap-2">
      <TemplateNewMenu onNew={onNew} newDisabled={newDisabled} io={io} exportDisabled={!hasActive} />
      {items.length > 0 ? (
        <TemplatePicker items={items} activeId={hasActive ? activeId : null} onPick={onPick} />
      ) : (
        <div className="h-10 flex-1 min-w-0 flex items-center px-3 rounded-xl bg-muted/40 text-sm text-muted-foreground truncate">{t("templates.noTemplates")}</div>
      )}
      {hasActive && (onRename || onDuplicate || onDelete) && (
        <TemplateActionsMenu disabled={disabled} onRename={onRename} onDuplicate={onDuplicate} onDelete={onDelete} duplicateDisabled={duplicateDisabled} />
      )}
    </div>
  );
}
