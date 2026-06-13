/**
 * OutlineInactivitySensor (Onda 7.12 / Missão 06.3).
 *
 * Sensor de esquecimento: arma um timeout de 60s quando montado e o
 * cronômetro do esboço está pausado/zerado. Se o usuário iniciar o
 * cronômetro antes, cancela. Senão, exibe um banner flutuante no topo
 * (z-[160]) com presets de tempo para iniciar o cronômetro rapidamente.
 *
 * Lógica 100% client-side. Dedupe entre múltiplas superfícies (toolbar
 * inline + tela cheia + dialog de tela cheia da dashboard) via reserva
 * de "owner" por outlineId — só a primeira instância montada renderiza
 * o banner para evitar duplicação visual.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOutlineTimer } from "@/hooks/use-outline-timer";
import { cn } from "@/lib/utils";

const PRESET_MIN = [5, 14, 19, 24, 29, 44];
const DISMISS_PREFIX = "visita-sc:outline-sensor-dismissed:";
const INACTIVITY_MS = 60_000;

// Reserva por outlineId — primeiro mount ganha o direito de renderizar.
const owners = new Map<string, number>();

interface Props {
  outlineId: string;
  className?: string;
}

function isDismissed(outlineId: string): boolean {
  try {
    return sessionStorage.getItem(DISMISS_PREFIX + outlineId) === "1";
  } catch {
    return false;
  }
}

export function OutlineInactivitySensor({ outlineId, className }: Props) {
  const { t } = useTranslation();
  const timer = useOutlineTimer(outlineId);
  const [isOwner, setIsOwner] = useState(false);
  const [show, setShow] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const firedRef = useRef(false);

  // Claim de ownership por outlineId.
  useEffect(() => {
    const next = (owners.get(outlineId) ?? 0) + 1;
    owners.set(outlineId, next);
    setIsOwner(next === 1);
    return () => {
      const cur = (owners.get(outlineId) ?? 1) - 1;
      if (cur <= 0) owners.delete(outlineId);
      else owners.set(outlineId, cur);
    };
  }, [outlineId]);

  // Sensor de 60s. Só arma se for owner, cronômetro pausado/zerado e não dispensado.
  useEffect(() => {
    if (!isOwner) return;
    if (firedRef.current) return;
    if (isDismissed(outlineId)) return;
    if (timer.isRunning || timer.elapsedSec > 0) return;

    const id = window.setTimeout(() => {
      firedRef.current = true;
      setShow(true);
    }, INACTIVITY_MS);
    return () => window.clearTimeout(id);
  }, [isOwner, outlineId, timer.isRunning, timer.elapsedSec]);

  // Se o usuário iniciar o cronômetro manualmente, esconde o banner.
  useEffect(() => {
    if (timer.isRunning || timer.elapsedSec > 0) {
      setShow(false);
    }
  }, [timer.isRunning, timer.elapsedSec]);

  if (!isOwner || !show) return null;

  const applyMinutes = (m: number) => {
    if (!Number.isFinite(m) || m <= 0 || m > 120) return;
    timer.setTarget(Math.round(m) * 60);
    timer.reset();
    timer.start();
    setShow(false);
    setCustomOpen(false);
    setCustomMin("");
  };

  const dismissForever = () => {
    try {
      sessionStorage.setItem(DISMISS_PREFIX + outlineId, "1");
    } catch {
      /* noop */
    }
    setShow(false);
  };

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
      <div className="mx-auto max-w-3xl pointer-events-auto rounded-lg border border-amber-500/50 bg-amber-50 text-amber-900 shadow-lg dark:bg-amber-950 dark:text-amber-100 p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold mb-2">
              {t("personalOutlines.timer.sensorPrompt", {
                defaultValue: "Esqueceu de iniciar? Ativar cronômetro:",
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_MIN.map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => applyMinutes(m)}
                >
                  {m}
                  {t("personalOutlines.timer.minShort", { defaultValue: "min" })}
                </Button>
              ))}
              {!customOpen ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => setCustomOpen(true)}
                >
                  {t("personalOutlines.timer.sensorOther", {
                    defaultValue: "Outro...",
                  })}
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={120}
                    value={customMin}
                    onChange={(e) =>
                      setCustomMin(e.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyMinutes(Number(customMin));
                      }
                    }}
                    className="h-7 w-16 text-xs"
                    autoFocus
                    aria-label={t("personalOutlines.timer.custom", {
                      defaultValue: "Personalizado",
                    })}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => applyMinutes(Number(customMin))}
                  >
                    {t("personalOutlines.timer.apply", { defaultValue: "OK" })}
                  </Button>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={dismissForever}
              >
                {t("personalOutlines.timer.sensorDontRemind", {
                  defaultValue: "Não lembrar novamente",
                })}
              </Button>
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900"
            onClick={() => setShow(false)}
            aria-label={t("common.close", { defaultValue: "Fechar" })}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
