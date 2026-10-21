/**
 * OutlineTimer (Onda 7.12 / Missão 06 + 06.1).
 *
 * Apresenta o cronômetro de esboço em duas variantes:
 *  - "toolbar":     compacto, embutido na barra de ferramentas do editor.
 *  - "fullscreen":  banner flutuante fixo no topo da tela cheia.
 *
 * Estado é vinculado ao outlineId via useOutlineTimer (persistido em
 * localStorage + sincronizado entre superfícies via BroadcastChannel).
 * Tema visual configurável (semafórico ou alto contraste) via useTimerTheme.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pause,
  Play,
  RotateCcw,
  Timer as TimerIcon,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  alertMilestoneFor,
  formatMMSS,
  useOutlineTimer,
  type AlertLevel,
} from "@/hooks/use-outline-timer";
import { useTimerSize } from "@/lib/timer-size";
import { TIMER_THEMES, useTimerTheme } from "@/lib/timer-theme";

interface OutlineTimerProps {
  outlineId: string;
  variant: "toolbar" | "fullscreen";
  className?: string;
}

const PRESETS_MIN = [5, 10, 15, 30, 45];
const ALERT_KEY_PREFIX = "visita-sc:outline-timer-alert:";

function readShownMilestone(outlineId: string): number {
  try {
    const raw = window.localStorage.getItem(ALERT_KEY_PREFIX + outlineId);
    const n = raw === null ? -1 : Number(raw);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

function writeShownMilestone(outlineId: string, milestone: number): void {
  try {
    window.localStorage.setItem(ALERT_KEY_PREFIX + outlineId, String(milestone));
  } catch {
    /* quota / modo privado — ignora */
  }
}

function alertColorClass(level: AlertLevel): string {
  if (level === "red") return "text-timer-over";
  if (level === "amber") return "text-timer-warn";
  return "text-timer-ok";
}

const CONTROLS_KEY = "visita-sc:timer-controls-collapsed";

export function OutlineTimer({ outlineId, variant, className }: OutlineTimerProps) {
  const { t } = useTranslation();
  const timer = useOutlineTimer(outlineId);
  const { themeId, preset, setThemeId } = useTimerTheme();
  const size = useTimerSize();
  const [targetOpen, setTargetOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [customMin, setCustomMin] = useState<string>(
    String(Math.round(timer.targetSec / 60)),
  );
  const lastTapRef = useRef<number>(0);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  useEffect(() => {
    try { setControlsCollapsed(window.localStorage.getItem(CONTROLS_KEY) === "1"); } catch { /* noop */ }
  }, []);
  const toggleControls = () => {
    setControlsCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(CONTROLS_KEY, next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  };

  const overtimeSec = Math.max(0, timer.elapsedSec - timer.targetSec);
  const display =
    timer.mode === "countdown"
      ? overtimeSec > 0
        ? `+${formatMMSS(overtimeSec)}`
        : formatMMSS(timer.remainingSec)
      : formatMMSS(timer.elapsedSec);
  const isFullscreen = variant === "fullscreen";
  const isAuto = themeId === "auto";

  // Marco de aviso aberto no momento (null = nenhum).
  const [warnMilestone, setWarnMilestone] = useState<number | null>(null);

  // Relógio de parede usado apenas quando pausado: enquanto o cronômetro
  // corre, `remainingSec` muda a cada segundo e já força re-render. Quando
  // pausado, precisamos atualizar a hora de término estimada para refletir
  // o relógio real (se o usuário reiniciasse naquele instante).
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (timer.isRunning) return;
    // Pausado: a hora de término (HH:MM) só precisa de atualização ocasional.
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [timer.isRunning]);

  const endLabel = useMemo(() => {
    const base = timer.isRunning ? Date.now() : now;
    let remainingMs: number;
    if (timer.mode === "countdown") {
      remainingMs = timer.remainingSec * 1000;
    } else {
      const remainingSec = Math.max(0, timer.targetSec - timer.elapsedSec);
      remainingMs = remainingSec * 1000;
    }
    const end = new Date(base + remainingMs);
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(end);
  }, [timer.mode, timer.isRunning, timer.remainingSec, timer.elapsedSec, timer.targetSec, now]);

  // Avisos por marco (falta 1 min, terminou, passou 1..5 min). Vale para os
  // dois modos e todas as superfícies (modo esboço e tela cheia). O marco
  // já exibido fica em localStorage por esboço: a primeira instância a ver
  // o marco o "reivindica" e as demais (ou um reload) não repetem.
  const milestone = alertMilestoneFor(timer.elapsedSec, timer.targetSec);
  useEffect(() => {
    if (!outlineId) return;
    const stored = readShownMilestone(outlineId);
    if (milestone <= stored) {
      if (milestone < stored) writeShownMilestone(outlineId, milestone);
      return;
    }
    writeShownMilestone(outlineId, milestone);
    // Só avisa com o cronômetro correndo (ou no instante em que para
    // sozinho no limite de 5 minutos excedidos).
    if (!timer.isRunning && milestone < 6) return;
    setWarnMilestone(milestone);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(
          milestone === 0 ? [300, 120, 300, 120, 600] : [600, 200, 600, 200, 900],
        );
      } catch {
        /* noop */
      }
    }
  }, [outlineId, milestone, timer.isRunning]);

  const warnTitle =
    warnMilestone === 0
      ? t("personalOutlines.timer.oneMinuteWarningTitle", { defaultValue: "Falta 1 minuto!" })
      : warnMilestone === 1
        ? t("personalOutlines.timer.timeUpTitle", { defaultValue: "O tempo terminou!" })
        : t("personalOutlines.timer.overtimeTitle", {
            count: (warnMilestone ?? 2) - 1,
            defaultValue: "Você passou {{count}} minuto(s)",
          });
  const warnDesc =
    warnMilestone === 0
      ? t("personalOutlines.timer.oneMinuteWarningDesc", {
          defaultValue: "Resta apenas 1 minuto para o tempo terminar.",
        })
      : warnMilestone === 1
        ? t("personalOutlines.timer.timeUpDesc", {
            defaultValue: "O tempo escolhido chegou ao fim.",
          })
        : t("personalOutlines.timer.overtimeDesc", {
            defaultValue: "Você já ultrapassou o tempo escolhido.",
          });

  const handleDisplayTap = () => {
    const now = Date.now();
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

  const controlsLabel = controlsCollapsed
    ? t("personalOutlines.timer.showControls", { defaultValue: "Mostrar botões" })
    : t("personalOutlines.timer.hideControls", { defaultValue: "Recolher botões" });

  const wrapClass = cn(
    "flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 sm:gap-x-1.5 select-none border",
    isFullscreen
      ? "w-full shrink-0 border-b bg-background/85 backdrop-blur px-2 sm:px-3 py-1 sm:py-1.5 justify-center min-h-8 sm:min-h-9"
      : "min-h-7 px-1.5 rounded-md",
    isAuto && !isFullscreen && "bg-muted/40",
    !isAuto && preset.chipBg,
    className,
  );

  const iconBtnSize = isFullscreen ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-3.5 w-3.5";
  const iconBtnClass = cn(
    "p-0 rounded-md transition-colors shrink-0",
    isFullscreen ? "h-7 w-7 sm:h-8 sm:w-8" : "h-7 w-7",
    isAuto ? "hover:bg-muted" : preset.iconColor,
  );
  const displayClass = cn(
    "tabular-nums font-semibold cursor-pointer select-none",
    isFullscreen ? size.preset.fullscreenText : size.preset.toolbarText,
    isAuto ? alertColorClass(timer.alertLevel) : preset.chipText,
  );
  const endLabelClass = cn(
    "tabular-nums font-bold whitespace-nowrap tracking-tight",
    "bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent",
    "[text-shadow:0_0_12px_rgba(56,189,248,0.55),0_0_28px_rgba(59,130,246,0.35)]",
    "drop-shadow-[0_0_6px_rgba(56,189,248,0.45)]",
    isFullscreen ? size.preset.fullscreenText : size.preset.toolbarText,
  );

  return (
    <div
      className={wrapClass}
      role="group"
      aria-label={t("personalOutlines.timer.label", { defaultValue: "Cronômetro do esboço" })}
    >
      <div className="flex items-center justify-center gap-1 min-w-0 max-w-full">
      <Popover open={targetOpen} onOpenChange={setTargetOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={iconBtnClass}
            title={t("personalOutlines.timer.setTarget", { defaultValue: "Definir tempo alvo" })}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={t("personalOutlines.timer.setTarget", { defaultValue: "Definir tempo alvo" })}
          >
            <TimerIcon className={iconBtnSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 z-[140]" align="center">
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

          <Separator className="my-3" />

          <div className="text-xs font-semibold mb-2 text-muted-foreground">
            {t("personalOutlines.timer.accessibility", {
              defaultValue: "Acessibilidade / Cores",
            })}
          </div>
          <div
            className="grid grid-cols-2 gap-1.5"
            role="radiogroup"
            aria-label={t("personalOutlines.timer.accessibility", {
              defaultValue: "Acessibilidade / Cores",
            })}
          >
            {TIMER_THEMES.map((p) => {
              const active = themeId === p.id;
              const label = t(p.labelKey, { defaultValue: p.id });
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setThemeId(p.id);
                    setTargetOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md border p-1.5 text-left text-[11px] transition",
                    active
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:bg-muted",
                  )}
                  title={label}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-9 h-6 rounded text-[10px] font-bold tabular-nums border",
                      p.swatchBg,
                      p.swatchText,
                    )}
                    aria-hidden="true"
                  >
                    12
                  </span>
                  <span className="truncate flex-1">{label}</span>
                </button>
              );
            })}
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

      {endLabel && (
        <span
          className={endLabelClass}
          aria-label={t("personalOutlines.timer.endAt", { defaultValue: "Hora de término estimada" })}
        >
          {t("personalOutlines.timer.endShort", { defaultValue: "Término" })}: {endLabel}
        </span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(iconBtnClass, "h-6 w-6")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleControls}
        aria-expanded={!controlsCollapsed}
        title={controlsLabel}
        aria-label={controlsLabel}
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", controlsCollapsed && "-rotate-90")}
        />
      </Button>
      </div>

      <div
        className={cn("flex items-center justify-center gap-1 shrink-0", controlsCollapsed && "hidden")}
      >
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
        aria-label={
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
        onClick={() => setResetOpen(true)}
        title={t("personalOutlines.timer.reset", { defaultValue: "Reiniciar" })}
        aria-label={t("personalOutlines.timer.reset", { defaultValue: "Reiniciar" })}
      >
        <RotateCcw className={iconBtnSize} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtnClass}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => size.decrease()}
        disabled={!size.canDecrease}
        title={t("personalOutlines.timer.zoomOut", {
          defaultValue: "Diminuir tamanho",
        })}
        aria-label={t("personalOutlines.timer.zoomOut", {
          defaultValue: "Diminuir tamanho",
        })}
      >
        <ZoomOut className={iconBtnSize} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtnClass}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => size.increase()}
        disabled={!size.canIncrease}
        title={t("personalOutlines.timer.zoomIn", {
          defaultValue: "Aumentar tamanho",
        })}
        aria-label={t("personalOutlines.timer.zoomIn", {
          defaultValue: "Aumentar tamanho",
        })}
      >
        <ZoomIn className={iconBtnSize} />
      </Button>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("personalOutlines.timer.resetConfirmTitle", {
                defaultValue: "Deseja reiniciar o cronômetro?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("personalOutlines.timer.resetConfirmDesc", {
                defaultValue: "O tempo decorrido voltará a 00:00.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.cancel", { defaultValue: "Cancelar" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                timer.reset();
                setResetOpen(false);
              }}
            >
              {t("personalOutlines.timer.resetConfirm", {
                defaultValue: "Confirmar",
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={warnMilestone !== null}
        onOpenChange={(open) => {
          if (!open) setWarnMilestone(null);
        }}
      >
        <AlertDialogContent className="z-[160] border-destructive bg-destructive text-destructive-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive-foreground">
              <AlertTriangle className="h-5 w-5" />
              {warnTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-destructive-foreground/90">
              {warnDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setWarnMilestone(null)}
              className="bg-background text-foreground hover:bg-background/90"
            >
              {t("common.ok", { defaultValue: "OK" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
