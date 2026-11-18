// Painel (estilo One UI) antes de gerar o Quadro de anúncios: liga/desliga as duas frases opcionais.
// A escolha fica só no aparelho; o PDF é gerado sob demanda.
import { useState } from "react";
import { toast } from "sonner";
import { LayoutPanelTop, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { BOARD_BOTTOM_PHRASE, BOARD_TOP_PHRASE } from "@/lib/visit-week/board-program";

const KEY = "board.phrases";
type Prefs = { top: boolean; bottom: boolean };
function loadPrefs(): Prefs {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    return { top: o.top !== false, bottom: o.bottom !== false };
  } catch { return { top: true, bottom: true }; }
}

function Row({ id, title, text, checked, onChange }: { id: string; title: string; text: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 px-4 py-3.5 cursor-pointer">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-[13px] italic leading-snug text-muted-foreground break-words">{text}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </label>
  );
}

export default function BoardProgramSheet({ open, onOpenChange, visitId, userId }: {
  open: boolean; onOpenChange: (v: boolean) => void; visitId: string; userId: string;
}) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Prefs>) => setPrefs((cur) => {
    const next = { ...cur, ...p };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* cheio */ }
    return next;
  });

  const run = async () => {
    setBusy(true);
    try {
      const m = await import("@/components/visit-week/board-program-export");
      await m.exportBoardProgram(visitId, userId, { topPhrase: prefs.top, bottomPhrase: prefs.bottom });
      toast.success("Quadro de anúncios pronto.");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o quadro.");
    } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2"><LayoutPanelTop className="h-5 w-5 text-primary" /> Quadro de anúncios</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto overflow-x-hidden px-4 pb-6">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Frases do quadro</p>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border bg-card">
            <Row id="board-top" title="Frase do topo" text={BOARD_TOP_PHRASE} checked={prefs.top} onChange={(v) => set({ top: v })} />
            <Row id="board-bottom" title="Frase do rodapé" text={BOARD_BOTTOM_PHRASE} checked={prefs.bottom} onChange={(v) => set({ bottom: v })} />
          </div>
          <p className="px-1 text-xs text-muted-foreground">A reunião do meio de semana sai com todas as partes do controle de tempo da reunião.</p>
          <Button className="h-12 w-full rounded-full text-base" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Gerar PDF
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
