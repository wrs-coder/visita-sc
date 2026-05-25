import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { shareJsonFile, readJsonFile } from "@/lib/share";

interface Props {
  filenameBase: string;
  onExport: () => Promise<{ ok: boolean; file?: unknown; error?: string }>;
  onImport: (file: unknown) => Promise<{ ok: boolean; error?: string }>;
  disabled?: boolean;
}

export function TemplateIOButtons({ filenameBase, onExport, onImport, disabled }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "export" | "import">(null);

  const doExport = async () => {
    setBusy("export");
    const r = await onExport();
    setBusy(null);
    if (!r.ok || !r.file) { toast.error(r.error ?? t("templateIO.exportFail")); return; }
    const safe = filenameBase.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 60) || "modelo";
    const fname = `${safe}-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const result = await shareJsonFile(fname, r.file);
      toast.success(result === "shared" ? t("templateIO.shared") : t("templateIO.downloaded"));
    } catch (e) {
      toast.error(t("templateIO.shareFail"), { description: (e as Error).message });
    }
  };

  const doImport = async (file: File) => {
    setBusy("import");
    try {
      const json = await readJsonFile(file);
      const r = await onImport(json);
      if (!r.ok) toast.error(r.error ?? t("templateIO.importFail"));
      else toast.success(t("templateIO.imported"));
    } catch (e) {
      toast.error(t("templateIO.invalidFile"), { description: (e as Error).message });
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={doExport} disabled={disabled || busy !== null}>
        {busy === "export" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
        {t("templateIO.export")}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled || busy !== null}>
        {busy === "import" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
        {t("templateIO.import")}
      </Button>
      <input
        ref={inputRef} type="file" accept="application/json,.json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); }}
      />
    </div>
  );
}
