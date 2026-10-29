// "O que há de novo" — aparece uma vez na primeira abertura do app atualizado.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { isNativeApp } from "@/lib/api-origin";
import { getInstalledVersion } from "@/lib/app-update-check";
import {
  RELEASE_HISTORY,
  RELEASE_NOTES_VERSION,
  type ReleaseSection,
} from "@/lib/release-notes";

const current = RELEASE_HISTORY[0];
const older = RELEASE_HISTORY.slice(1);

function ReleaseSections({ sections }: { sections: ReleaseSection[] }) {
  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <section key={s.title}>
          <h3 className="mb-1 text-sm font-semibold text-primary">{s.title}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {s.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
import {
  OPEN_WHATS_NEW_EVENT,
  WHATS_NEW_KEY,
  hasPreviousUse,
  shouldShowWhatsNew,
} from "@/lib/whats-new";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storedKeys(): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k) out.push(k);
    }
    return out;
  } catch {
    return [];
  }
}

export function WhatsNewDialog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  // "Já usava o app" é medido na primeira montagem, antes de qualquer gravação nova.
  const [previousUse] = useState(() =>
    typeof window === "undefined" ? false : hasPreviousUse(storedKeys()),
  );

  // Abrir sob pedido (Configurações → Ver novidades).
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_WHATS_NEW_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_WHATS_NEW_EVENT, onOpen);
  }, []);

  // Automático: só no app instalado e depois de entrar/desbloquear, para não
  // ficar escondida atrás da tela de PIN/biometria.
  const signedIn = !!user;
  useEffect(() => {
    if (!isNativeApp() || !signedIn) return;
    let cancelled = false;
    void (async () => {
      const installed = await getInstalledVersion();
      const seen = read(WHATS_NEW_KEY);
      const show = shouldShowWhatsNew({
        installed,
        notesVersion: RELEASE_NOTES_VERSION,
        seen,
        hadPreviousUse: previousUse,
      });
      if (!show) {
        // Instalação nova: marca como visto para não aparecer depois.
        if (installed === RELEASE_NOTES_VERSION && seen !== RELEASE_NOTES_VERSION) {
          try { localStorage.setItem(WHATS_NEW_KEY, RELEASE_NOTES_VERSION); } catch { /* noop */ }
        }
        return;
      }
      if (!cancelled) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, previousUse]);

  const close = (next: boolean) => {
    if (next) return;
    try { localStorage.setItem(WHATS_NEW_KEY, RELEASE_NOTES_VERSION); } catch { /* noop */ }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            {t("whatsNew.title", "Bem-vindo à versão {{v}}!", { v: RELEASE_NOTES_VERSION })}
          </DialogTitle>
          <DialogDescription>
            {t("whatsNew.desc", "Confira o que há de novo nesta atualização.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
            {t("whatsNew.current", "Versão {{v}} (atual)", { v: current.version })}
          </p>
          <ReleaseSections sections={current.sections} />
          {older.length > 0 && (
            <details className="rounded-lg border border-border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground">
                {t("whatsNew.history", "Ver versões anteriores")}
              </summary>
              <div className="space-y-2 px-3 pb-3">
                {older.map((r) => (
                  <details key={r.version} className="rounded-md bg-muted/40">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                      {t("whatsNew.version", "Versão {{v}}", { v: r.version })}
                    </summary>
                    <div className="px-3 pb-3">
                      <ReleaseSections sections={r.sections} />
                    </div>
                  </details>
                ))}
              </div>
            </details>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => close(false)}>{t("whatsNew.ok", "Entendi")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
