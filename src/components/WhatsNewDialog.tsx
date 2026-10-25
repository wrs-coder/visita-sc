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
import { isNativeApp } from "@/lib/api-origin";
import { getInstalledVersion } from "@/lib/app-update-check";
import { RELEASE_NOTES, RELEASE_NOTES_VERSION } from "@/lib/release-notes";
import { WHATS_NEW_KEY, shouldShowWhatsNew } from "@/lib/whats-new";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function WhatsNewDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    void (async () => {
      const installed = await getInstalledVersion();
      const seen = read(WHATS_NEW_KEY);
      const hadPreviousUse =
        !!read("visita-sc:last-auth-user") || !!read("visita-sc:last-update-check");
      const show = shouldShowWhatsNew({
        installed,
        notesVersion: RELEASE_NOTES_VERSION,
        seen,
        hadPreviousUse,
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
  }, []);

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
          {RELEASE_NOTES.map((s) => (
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
        <DialogFooter>
          <Button onClick={() => close(false)}>{t("whatsNew.ok", "Entendi")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
