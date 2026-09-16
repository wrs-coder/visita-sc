// Diagnóstico de conexão do aplicativo instalado (casca local).
// Se a casca abrir mas nenhum dos endereços publicados responder, mostra um
// aviso claro com botão "tentar novamente" e o resultado de cada endereço.
// No site (navegador) o componente não faz nada.
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  isNativeApp,
  probeAllOrigins,
  resolveBestApiOrigin,
  type OriginProbeResult,
} from "@/lib/api-origin";

// Só avisa depois de duas falhas seguidas, para não assustar por uma
// oscilação momentânea de rede.
const FAILURES_BEFORE_WARNING = 2;
const RETRY_DELAY_MS = 10000;

export function AppOriginDiagnostics() {
  const [unreachable, setUnreachable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [details, setDetails] = useState<OriginProbeResult[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const failures = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(async () => {
    if (!isNativeApp()) return;
    setChecking(true);
    try {
      const origin = await resolveBestApiOrigin();
      if (origin) {
        failures.current = 0;
        setUnreachable(false);
        setDetails([]);
      } else {
        failures.current += 1;
        const failing = failures.current >= FAILURES_BEFORE_WARNING;
        setUnreachable(failing);
        if (failing) setDetails(await probeAllOrigins());
      }
    } catch {
      failures.current += 1;
      setUnreachable(failures.current >= FAILURES_BEFORE_WARNING);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const schedule = () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(run, RETRY_DELAY_MS);
    };

    const run = async () => {
      if (cancelled) return;
      await check();
      if (!cancelled && failures.current > 0) schedule();
    };

    void run();
    const onOnline = () => {
      failures.current = 0;
      void run();
    };
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      window.removeEventListener("online", onOnline);
    };
  }, [check]);

  if (!unreachable) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[150] border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <div className="flex items-center gap-3">
          <WifiOff className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="flex-1 text-sm text-muted-foreground">
            Sem conexão com o servidor. Você pode continuar usando os dados já baixados.
          </p>
          <Button size="sm" variant="outline" disabled={checking} onClick={() => void check()}>
            <RefreshCw className={checking ? "size-4 animate-spin" : "size-4"} aria-hidden />
            Tentar
          </Button>
        </div>

        {details.length > 0 && (
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setShowDetails((value) => !value)}
              aria-expanded={showDetails}
            >
              <ChevronDown
                className={showDetails ? "size-3 rotate-180 transition" : "size-3 transition"}
                aria-hidden
              />
              Detalhes da conexão
            </button>
            {showDetails && (
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {details.map((item) => (
                  <li key={item.origin} className="flex justify-between gap-2">
                    <span className="truncate">{item.origin.replace("https://", "")}</span>
                    <span className={item.ok ? "text-primary" : "text-destructive"}>
                      {item.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
