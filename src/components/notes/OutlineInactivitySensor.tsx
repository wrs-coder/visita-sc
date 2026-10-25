/**
 * OutlineInactivitySensor — alerta "Esqueceu de iniciar?".
 *
 * Arma 60s após abrir o esboço (modo esboço / tela cheia) com o cronômetro
 * parado e zerado. Mostra em destaque o tempo já escolhido para o esboço
 * (ou sugestões, se nunca escolheu) e pergunta se começa do zero ou
 * desconta o tempo decorrido desde a abertura.
 *
 * Várias superfícies podem montar o sensor ao mesmo tempo: só a primeira
 * da fila exibe o banner; quando ela fecha, a próxima assume.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMMSS, useOutlineTimer } from "@/hooks/use-outline-timer";
import { cn } from "@/lib/utils";

const PRESET_MIN = [5, 14, 19, 24, 29, 44];
const DISMISS_PREFIX = "visita-sc:outline-sensor-dismissed:";
const INACTIVITY_MS = 60_000;

// Fila de instâncias por esboço + hora de abertura (primeira instância).
const queues = new Map<string, string[]>();
const openedAt = new Map<string, number>();
const bus = typeof window !== "undefined" ? new EventTarget() : null;
const OWNER_EVENT = "outline-sensor-owner";

function isDismissed(outlineId: string): boolean {
  try {
    return localStorage.getItem(DISMISS_PREFIX + outlineId) === "1";
  } catch {
    return false;
  }
}

/** Permite reativar o alerta (usado pelo menu do cronômetro). */
export function resetSensorDismiss(outlineId: string): void {
  try { localStorage.removeItem(DISMISS_PREFIX + outlineId); } catch { /* noop */ }
}

export function isSensorDismissed(outlineId: string): boolean {
  return isDismissed(outlineId);
}

interface Props {
  outlineId: string;
  className?: string;
}

export function OutlineInactivitySensor({ outlineId, className }: Props) {
  const { t } = useTranslation();
  const timer = useOutlineTimer(outlineId);
  const [isOwner, setIsOwner] = useState(false);
  const [show, setShow] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const [pendingMin, setPendingMin] = useState<number | null>(null);
  const firedRef = useRef(false);
  const tokenRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const token = tokenRef.current;
    const q = queues.get(outlineId) ?? [];
    if (q.length === 0) openedAt.set(outlineId, Date.now());
    queues.set(outlineId, [...q, token]);
    const check = () => setIsOwner((queues.get(outlineId) ?? [])[0] === token);
    check();
    bus?.addEventListener(OWNER_EVENT, check);
    return () => {
      bus?.removeEventListener(OWNER_EVENT, check);
      const rest = (queues.get(outlineId) ?? []).filter((x) => x !== token);
      if (rest.length === 0) {
        queues.delete(outlineId);
        openedAt.delete(outlineId);
      } else queues.set(outlineId, rest);
      bus?.dispatchEvent(new Event(OWNER_EVENT));
    };
  }, [outlineId]);

  useEffect(() => {
    if (!isOwner || firedRef.current || isDismissed(outlineId)) return;
    if (timer.isRunning || timer.elapsedSec > 0) return;
    const id = window.setTimeout(() => {
      firedRef.current = true;
      setShow(true);
    }, INACTIVITY_MS);
    return () => window.clearTimeout(id);
  }, [isOwner, outlineId, timer.isRunning, timer.elapsedSec]);

  useEffect(() => {
    if (timer.isRunning || timer.elapsedSec > 0) setShow(false);
  }, [timer.isRunning, timer.elapsedSec]);

  if (!isOwner || !show) return null;

  const close = () => {
    setShow(false);
    setPendingMin(null);
    setCustomOpen(false);
    setCustomMin("");
  };

  const chooseMinutes = (m: number) => {
    if (!Number.isFinite(m) || m <= 0 || m > 120) return;
    setPendingMin(Math.round(m));
  };

  const elapsedSinceOpen = Math.max(0, Math.floor((Date.now() - (openedAt.get(outlineId) ?? Date.now())) / 1000));

  const startTimer = (discount: boolean) => {
    if (pendingMin === null) return;
    timer.startWith(pendingMin * 60, discount ? elapsedSinceOpen : 0);
    close();
  };

  const dismissForever = () => {
    try { localStorage.setItem(DISMISS_PREFIX + outlineId, "1"); } catch { /* noop */ }
    close();
  };

  const chosenMin = timer.targetChosen ? Math.round(timer.targetSec / 60) : null;
  const minLabel = t("personalOutlines.timer.minShort", { defaultValue: "min" });

  return (
    <div
      className={cn(
        "fixed top-2 inset-x-0 z-[160] px-2 sm:px-4 pointer-events-none",
        "animate-in slide-in-from-top-4 fade-in duration-200",
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="mx-auto max-w-3xl pointer-events-auto rounded-lg border border-timer-warn/50 bg-card text-card-foreground shadow-lg p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {pendingMin === null ? (
              <>
                <div className="text-sm font-semibold mb-2">
                  {t("personalOutlines.timer.sensorPrompt", { defaultValue: "Esqueceu de iniciar? Ativar cronômetro:" })}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {chosenMin !== null && (
                    <Button type="button" size="sm" className="h-8 px-3 text-sm font-semibold" onClick={() => chooseMinutes(chosenMin)}>
                      {t("personalOutlines.timer.sensorStartChosen", { min: chosenMin, defaultValue: "Iniciar {{min}} min" })}
                    </Button>
                  )}
                  {PRESET_MIN.filter((m) => m !== chosenMin).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn("px-2 text-xs", chosenMin !== null ? "h-6 opacity-80" : "h-7")}
                      onClick={() => chooseMinutes(m)}
                    >
                      {m}{minLabel}
                    </Button>
                  ))}
                  {!customOpen ? (
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setCustomOpen(true)}>
                      {t("personalOutlines.timer.sensorOther", { defaultValue: "Outro..." })}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={120}
                        value={customMin}
                        onChange={(e) => setCustomMin(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            chooseMinutes(Number(customMin));
                          }
                        }}
                        className="h-7 w-16 text-xs"
                        autoFocus
                        aria-label={t("personalOutlines.timer.custom", { defaultValue: "Personalizado" })}
                      />
                      <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => chooseMinutes(Number(customMin))}>
                        {t("personalOutlines.timer.apply", { defaultValue: "OK" })}
                      </Button>
                    </div>
                  )}
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={dismissForever}>
                    {t("personalOutlines.timer.sensorDontRemind", { defaultValue: "Não lembrar novamente" })}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold mb-2">
                  {t("personalOutlines.timer.sensorHowStart", { min: pendingMin, defaultValue: "Cronômetro de {{min}} min. Como começar?" })}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => startTimer(false)}>
                    {t("personalOutlines.timer.sensorFromZero", { defaultValue: "Começar do zero" })}
                  </Button>
                  <Button type="button" size="sm" className="h-8 px-3 text-xs" onClick={() => startTimer(true)}>
                    {t("personalOutlines.timer.sensorDiscount", { time: formatMMSS(elapsedSinceOpen), defaultValue: "Descontar {{time}} decorridos" })}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setPendingMin(null)}>
                    {t("common.back", { defaultValue: "Voltar" })}
                  </Button>
                </div>
              </>
            )}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={close}
            aria-label={t("common.close", { defaultValue: "Fechar" })}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
