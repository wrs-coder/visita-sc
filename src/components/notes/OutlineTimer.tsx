/**
 * OutlineTimer (Onda 7.12 / Missão 06).
 *
 * Apresenta o cronômetro de esboço em duas variantes:
 *  - "toolbar":     compacto, embutido na barra de ferramentas do editor.
 *  - "fullscreen":  banner flutuante fixo no topo da tela cheia.
 *
 * Estado é vinculado ao outlineId via useOutlineTimer (persistido em
 * localStorage + sincronizado entre superfícies via BroadcastChannel).
 */
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, RotateCcw, Timer as TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatMMSS,
  useOutlineTimer,
  type AlertLevel,
} from "@/hooks/use-outline-timer";

interface OutlineTimerProps {
  outlineId: string;
  variant: "toolbar" | "fullscreen";
  className?: string;
}

const PRESETS_MIN = [5, 10, 15, 30, 45];

function alertColorClass(level: AlertLevel): string {
  if (level === "red") return "text-destructive";
  if (level === "amber") return "text-amber-500";
  return "text-emerald-600";
}

export function OutlineTimer({ outlineId, variant, className }: OutlineTimerProps) {
  const { t } = useTranslation();
  const timer = useOutlineTimer(outlineId);
  const [targetOpen, setTargetOpen] = useState(false);
  const [customMin, setCustomMin] = useState<string>(
    String(Math.round(timer.targetSec / 60)),
  );
  const lastTapRef = useRef<number>(0);

  const displaySec =
    timer.mode === "countdown" ? timer.remainingSec : timer.elapsedSec;
  const display = formatMMSS(displaySec);
  const colorClass = alertColorClass(timer.alertLevel);
  const isFullscreen = variant === "fullscreen";

  const handleDisplayTap = () => {
    const now = Date.now();
    // Single tap → toggleMode. (Double-tap não é necessário aqui.)
    if (now - lastTapRef.current < 60) return;
    lastTapRef.current = now;
    timer.toggleMode();
  };

  const applyCustom = () => {
    const n = Number(customMin);
    if (!Number.isFinite(n) || n <= 0) return;
    timer.setTarget(Math.round(n) * 60);
    setTargetOpen(false);
  };

  const wrapClass = cn(
    "flex items-center gap-1.5 select-none",
    isFullscreen
      ? "fixed top-0 inset-x-0 z-[105] border-b bg-background/85 backdrop-blur px-3 py-1.5 justify-center"
      : "h-7",
    className,
  );

  const iconBtnSize = isFullscreen ? "h-4 w-4" : "h-3.5 w-3.5";
  const iconBtnClass = cn(
    "p-0 rounded-md hover:bg-muted transition-colors shrink-0",
    isFullscreen ? "h-8 w-8" : "h-7 w-7",
  );
  const displayClass = cn(
    "tabular-nums font-semibold cursor-pointer select-none px-1",
    isFullscreen ? "text-lg" : "text-xs",
    colorClass,
  );

  return (
    <div
      className={wrapClass}
      role="group"
      aria-label={t("personalOutlines.timer.label", { defaultValue: "Cronômetro do esboço" })}
    >
      <Popover open={targetOpen} onOpenChange={setTargetOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={iconBtnClass}
            title={t("personalOutlines.timer.setTarget", { defaultValue: "Definir tempo alvo" })}
            onMouseDown={(e) => e.preventDefault()}
          >
            <TimerIcon className={iconBtnSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 z-[140]" align="center">
          <div className="text-xs font-semibold mb-2 text-muted-foreground">
            {t("personalOutlines.timer.setTarget", { defaultValue: "Definir tempo alvo" })}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS_MIN.map((m) => {
              const active = timer.targetSec === m * 60;
              return (
                <Button
                  key={m}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    timer.setTarget(m * 60);
                    setCustomMin(String(m));
                    setTargetOpen(false);
                  }}
                >
                  {m}
                  {t("personalOutlines.timer.minShort", { defaultValue: "min" })}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <Input
              type="number"
              min={1}
              max={120}
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              className="h-8 text-xs"
              placeholder={t("personalOutlines.timer.custom", { defaultValue: "Personalizado" })}
            />
            <Button type="button" size="sm" className="h-8" onClick={applyCustom}>
              {t("personalOutlines.timer.apply", { defaultValue: "OK" })}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        className={displayClass}
        onClick={handleDisplayTap}
        title={t("personalOutlines.timer.toggleMode", {
          defaultValue: "Alternar contagem regressiva/crescente",
        })}
      >
        {display}
      </button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtnClass}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => timer.toggle()}
        title={
          timer.isRunning
            ? t("personalOutlines.timer.pause", { defaultValue: "Pausar" })
            : t("personalOutlines.timer.play", { defaultValue: "Iniciar" })
        }
      >
        {timer.isRunning ? (
          <Pause className={iconBtnSize} />
        ) : (
          <Play className={iconBtnSize} />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtnClass}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => timer.reset()}
        title={t("personalOutlines.timer.reset", { defaultValue: "Reiniciar" })}
      >
        <RotateCcw className={iconBtnSize} />
      </Button>
    </div>
  );
}
