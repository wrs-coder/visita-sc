// Botão ⏱ no topo do Início (ao lado de Recados). A tela das reuniões só carrega ao tocar.
// Minimizar o controle deixa uma boia "Reunião"; tocar nela volta ao controle. O tempo
// nunca para: ele é calculado pelo relógio do aparelho (event-timer.ts).
import { lazy, Suspense, useState } from "react";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { TimerPart } from "@/lib/big-events/event-timer";

const MeetingFloatingTimer = lazy(() => import("./MeetingFloatingTimer"));

const MeetingHub = lazy(() => import("./MeetingHub"));

export default function MeetingTimerButton({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<{ progId: string | null; timing: boolean } | null>(null);
  const [minimized, setMinimized] = useState<{ id: string; timerKey: string; parts: TimerPart[] } | null>(null);
  const label = t("meeting.open", { defaultValue: "Controle de tempo da reunião" });
  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label={label} title={label}
        onClick={() => { setOpen(minimized ? { progId: minimized.id, timing: true } : { progId: null, timing: false }); setMinimized(null); }}>
        <Timer className="h-4 w-4" />
      </Button>
      {open && (
        <Suspense fallback={null}>
          <MeetingHub userId={userId} initialOpenId={open.progId} initialTiming={open.timing}
            onClose={() => setOpen(null)}
            onMinimize={(id, timerKey, parts) => { setOpen(null); setMinimized({ id, timerKey, parts }); }} />
        </Suspense>
      )}
      {minimized && !open && (
        <Suspense fallback={null}>
          <MeetingFloatingTimer timerKey={minimized.timerKey} parts={minimized.parts}
            onOpen={() => { setOpen({ progId: minimized.id, timing: true }); setMinimized(null); }} />
        </Suspense>
      )}
    </>
  );
}
