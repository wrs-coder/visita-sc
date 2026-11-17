// Botão ⏱ no topo do Início (ao lado de Recados). A tela das reuniões só carrega ao tocar.
import { lazy, Suspense, useState } from "react";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const MeetingHub = lazy(() => import("./MeetingHub"));

export default function MeetingTimerButton({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = t("meeting.open", { defaultValue: "Controle de tempo da reunião" });
  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label={label} title={label} onClick={() => setOpen(true)}>
        <Timer className="h-4 w-4" />
      </Button>
      {open && <Suspense fallback={null}><MeetingHub userId={userId} onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
}
