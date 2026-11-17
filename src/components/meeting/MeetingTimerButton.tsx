// Botão ⏱ no topo do Início (ao lado de Recados). A tela das reuniões só carrega ao tocar.
// Minimizar o controle deixa uma boia "Reunião"; tocar nela volta ao controle. O tempo
// nunca para: ele é calculado pelo relógio do aparelho (event-timer.ts).
import { lazy, Suspense, useState } from "react";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FloatingDock } from "@/components/notes/FloatingDock";

const MeetingHub = lazy(() => import("./MeetingHub"));

export default function MeetingTimerButton({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<{ progId: string | null; timing: boolean } | null>(null);
  const [minimized, setMinimized] = useState<string | null>(null);
  const label = t("meeting.open", { defaultValue: "Controle de tempo da reunião" });
  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label={label} title={label}
        onClick={() => { setOpen(minimized ? { progId: minimized, timing: true } : { progId: null, timing: false }); setMinimized(null); }}>
        <Timer className="h-4 w-4" />
      </Button>
      {open && (
        <Suspense fallback={null}>
          <MeetingHub userId={userId} initialOpenId={open.progId} initialTiming={open.timing}
            onClose={() => setOpen(null)}
            onMinimize={(id) => { setOpen(null); setMinimized(id); }} />
        </Suspense>
      )}
      {minimized && !open && (
        <FloatingDock storageKey="meeting.minimizedPos" defaultPos={{ side: "right", y: 160 }} mode="whole"
          onTap={() => { setOpen({ progId: minimized, timing: true }); setMinimized(null); }}
          className="rounded-full">
          <span className="flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur" aria-label={t("meeting.reopen", { defaultValue: "Voltar ao controle da reunião" })}>
            <Timer className="h-4 w-4 text-primary" />{t("meeting.title", { defaultValue: "Reunião" })}
          </span>
        </FloatingDock>
      )}
    </>
  );
}
