/**
 * Boia flutuante do cronômetro no Modo Esboço: fica parada ao rolar,
 * arrasta pela alça e se prende à borda mais próxima (estilo One UI).
 * A lógica de tempo é a mesma do OutlineTimer (useOutlineTimer).
 * O X fecha a boia; ela volta ao entrar de novo no Modo Esboço.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OutlineTimer } from "./OutlineTimer";
import { FloatingDock } from "./FloatingDock";

export function FloatingOutlineTimer({ outlineId }: { outlineId: string }) {
  const { t } = useTranslation();
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <FloatingDock
      storageKey="outlineTimer.floatPos"
      defaultPos={{ side: "right", y: 9999 }}
      gripLabel={t("personalOutlines.timer.move", { defaultValue: "Mover cronômetro" })}
      onClose={() => setClosed(true)}
      closeLabel={t("personalOutlines.timer.close", { defaultValue: "Fechar cronômetro" })}
    >
      <OutlineTimer outlineId={outlineId} variant="toolbar" className="border-0" />
    </FloatingDock>
  );
}
