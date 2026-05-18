import { useEffect, useState } from "react";
import { Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com") || h.includes("lovable.dev");
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia?.("(display-mode: standalone)").matches || navStandalone === true;
}

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; platform?: string };
  };
  if (w.Capacitor?.isNativePlatform?.()) return true;
  if (w.Capacitor?.platform && w.Capacitor.platform !== "web") return true;
  const ua = window.navigator.userAgent || "";
  // Capacitor's Android WebView injects this UA fragment
  if (/VisitaSC|CapacitorWebView/i.test(ua)) return true;
  // Custom scheme used by the Capacitor Android build
  if (window.location.protocol === "capacitor:" || window.location.protocol === "app:") return true;
  return false;
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mounted) return null;
  if (installed) return null;
  // Hide inside Lovable editor preview / iframe — won't work there.
  if (isPreviewHost() || isInIframe()) return null;

  const ios = isIos();

  const handleClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setDeferred(null);
      } catch {
        setDeferred(null);
      }
      return;
    }
    if (ios) { setShowIosHelp(true); return; }
    // Other browsers without prompt — show iOS-style fallback hint
    setShowIosHelp(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-elevated"
      >
        <Download className="mr-2 h-5 w-5" />
        Instalar no Telemóvel
      </Button>

      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar no telemóvel</DialogTitle>
            <DialogDescription>
              {ios
                ? "Para instalar no iPhone/iPad, siga estes passos no Safari:"
                : "Para instalar, abra esta página no navegador do seu telemóvel e use o menu para adicionar ao ecrã principal."}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Share className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Toque no botão <strong>Partilhar</strong> na barra do navegador.</span>
            </li>
            <li className="flex items-start gap-2">
              <Plus className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Escolha <strong>Adicionar ao Ecrã Principal</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <Download className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Confirme em <strong>Adicionar</strong>. O ícone aparecerá no seu telemóvel.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
