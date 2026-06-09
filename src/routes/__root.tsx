import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { PwaRegister } from "@/components/PwaRegister";
import { queryPersister, PERSIST_MAX_AGE, PERSIST_BUSTER } from "@/lib/query-persister";
import { flushQueue, startOfflineQueueAutoRetry } from "@/lib/offline-queue";
import { isOfflineMode } from "@/lib/connection-mode";
import "@/i18n";
import "@/lib/theme";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("common.notFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("common.notFoundDesc")}
        </p>
        <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          {t("common.goHome")}
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{t("common.somethingWrong")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            {t("common.tryAgain")}
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Visita do SC" },
      { name: "description", content: "Aplicativo para organizar a Semana da Visita do Superintendente de Circuito: cronograma, escala de campo, refeições e checklist da congregação." },
      { name: "theme-color", content: "#1e3a8a" },
      { property: "og:title", content: "Visita do SC" },
      { name: "twitter:title", content: "Visita do SC" },
      { property: "og:description", content: "Aplicativo para organizar a Semana da Visita do Superintendente de Circuito: cronograma, escala de campo, refeições e checklist da congregação." },
      { name: "twitter:description", content: "Aplicativo para organizar a Semana da Visita do Superintendente de Circuito: cronograma, escala de campo, refeições e checklist da congregação." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2Pcc719CF8OHWGlzZtireHW8YSA2/social-images/social-1778926410708-visita2sc26.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2Pcc719CF8OHWGlzZtireHW8YSA2/social-images/social-1778926410708-visita2sc26.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/icon-192.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Em Modo Offline, ignoramos eventos do supabase auth para evitar
      // logout automático causado por refresh-token vencido / falha de rede.
      // Só processamos SIGNED_IN (que vem do login manual) e SIGNED_OUT
      // explícito quando o app está em Modo Online.
      if (isOfflineMode() && event !== "SIGNED_IN") return;
      router.invalidate();
      queryClient.invalidateQueries();
      // Limpa cache persistido em troca de sessão para evitar vazar dados
      // do usuário anterior.
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        queryClient.clear();
      }
    });
    const onOnline = () => { flushQueue().catch((e) => console.warn("[boot] flush", e)); };
    window.addEventListener("online", onOnline);
    // Capacitor: app retomado do background
    document.addEventListener("resume", onOnline);
    // Rede crítica: rejeições não tratadas não devem matar a tela.
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      const msg = String((ev.reason as { message?: string })?.message ?? ev.reason ?? "");
      if (/network|fetch|timeout|offline|failed/i.test(msg)) {
        ev.preventDefault();
        console.warn("[unhandledrejection] suprimido (rede):", msg);
      }
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    // Tenta flush no boot e arma o auto-retry com backoff exponencial (Onda 4).
    flushQueue().catch((e) => console.warn("[boot] flush", e));
    startOfflineQueueAutoRetry();
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("resume", onOnline);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, [router, queryClient]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE,
        buster: PERSIST_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) =>
            q.state.status === "success" &&
            !(Array.isArray(q.queryKey) && typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("auth")),
        },
      }}
    >
      <AuthProvider>
        <PwaRegister />
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
