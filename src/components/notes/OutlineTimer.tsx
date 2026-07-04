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

function alertColorClass(level: AlertLevel): string {
  if (level === "red") return "text-destructive";
  if (level === "amber") return "text-amber-500";
  return "text-emerald-600";
}

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

  const displaySec =
    timer.mode === "countdown" ? timer.remainingSec : timer.elapsedSec;
  const display = formatMMSS(displaySec);
  const isFullscreen = variant === "fullscreen";
  const isAuto = themeId === "auto";

  // Aviso "falta 1 minuto" — dispara apenas uma vez por ciclo, na variante
  // "toolbar" (sempre montada) para evitar diálogo duplicado quando o banner
  // fullscreen também estiver visível.
  const [warnOpen, setWarnOpen] = useState(false);
  const warnedRef = useRef(false);

  // Relógio de parede usado apenas quando pausado: enquanto o cronômetro
  // corre, `remainingSec` muda a cada segundo e já força re-render. Quando
  // pausado, precisamos atualizar a hora de término estimada para refletir
  // o relógio real (se o usuário reiniciasse naquele instante).
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (timer.isRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer.isRunning]);

  const endLabel = useMemo(() => {
    if (timer.mode !== "countdown") return null;
    const base = timer.isRunning ? Date.now() : now;
    const end = new Date(base + timer.remainingSec * 1000);
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(end);
  }, [timer.mode, timer.isRunning, timer.remainingSec, now]);

  useEffect(() => {
    if (variant !== "toolbar") return;
    if (timer.mode !== "countdown") {
      warnedRef.current = false;
      return;
    }
    if (timer.remainingSec > 60) {
      warnedRef.current = false;
      return;
    }
    if (
      timer.isRunning &&
      timer.remainingSec > 0 &&
      timer.remainingSec <= 60 &&
      !warnedRef.current
    ) {
      warnedRef.current = true;
      setWarnOpen(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([300, 120, 300, 120, 600]);
        } catch {
          /* noop */
        }
      }
    }
  }, [variant, timer.mode, timer.isRunning, timer.remainingSec]);

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

  const wrapClass = cn(
    "flex items-center gap-1.5 select-none rounded-md border",
    isFullscreen
      ? "fixed top-0 inset-x-0 z-[105] border-b bg-background/85 backdrop-blur px-3 py-1.5 justify-center"
      : "min-h-7 flex-wrap px-1.5",
    isAuto && !isFullscreen && "bg-muted/40",
    !isAuto && preset.chipBg,
    className,
  );

  const iconBtnSize = isFullscreen ? "h-4 w-4" : "h-3.5 w-3.5";
  const iconBtnClass = cn(
    "p-0 rounded-md transition-colors shrink-0",
    isFullscreen ? "h-8 w-8" : "h-7 w-7",
    isAuto ? "hover:bg-muted" : preset.iconColor,
  );
  const displayClass = cn(
    "tabular-nums font-semibold cursor-pointer select-none",
    isFullscreen ? size.preset.fullscreenText : size.preset.toolbarText,
    isAuto ? alertColorClass(timer.alertLevel) : preset.chipText,
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
          className="text-[11px] sm:text-xs text-muted-foreground tabular-nums whitespace-nowrap"
          aria-label={t("personalOutlines.timer.endAt", { defaultValue: "Hora de término estimada" })}
        >
          {t("personalOutlines.timer.endShort", { defaultValue: "Término" })}: {endLabel}
        </span>
      )}

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

      <AlertDialog open={warnOpen} onOpenChange={setWarnOpen}>
        <AlertDialogContent className="z-[160] border-destructive bg-destructive text-destructive-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive-foreground">
              <AlertTriangle className="h-5 w-5" />
              {t("personalOutlines.timer.oneMinuteWarningTitle", {
                defaultValue: "Falta 1 minuto!",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-destructive-foreground/90">
              {t("personalOutlines.timer.oneMinuteWarningDesc", {
                defaultValue:
                  "Resta apenas 1 minuto para o tempo terminar.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setWarnOpen(false)}
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
