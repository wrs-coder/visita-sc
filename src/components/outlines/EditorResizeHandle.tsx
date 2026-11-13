import { useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Alça para esticar a área de texto sem limite (como nas Observações do
 * superintendente). Só a própria alça captura o toque: a rolagem da página e
 * a rolagem interna do texto continuam iguais. Toque duplo volta ao padrão.
 */
export function EditorResizeHandle({ value, onChange }: { value: number; onChange: (px: number) => void }) {
  const { t } = useTranslation();
  const drag = useRef<{ y: number; start: number } | null>(null);
  const label = t("personalOutlines.editor.resize", { defaultValue: "Arraste para ampliar o texto" });
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      title={label}
      tabIndex={0}
      className="mt-1 flex h-6 items-center justify-center rounded-md cursor-ns-resize touch-none select-none text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onPointerDown={(e) => {
        drag.current = { y: e.clientY, start: value };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        onChange(Math.max(0, drag.current.start + (e.clientY - drag.current.y)));
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onDoubleClick={() => onChange(0)}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); onChange(value + 40); }
        if (e.key === "ArrowUp") { e.preventDefault(); onChange(Math.max(0, value - 40)); }
      }}
    >
      <span className="h-1.5 w-12 rounded-full bg-muted-foreground/40" />
    </div>
  );
}
