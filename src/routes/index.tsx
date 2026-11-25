import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { readGuestSession } from "@/lib/guest-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visita SC — Acesso ao programa de visitas" },
      { name: "description", content: "Acesse o Visita SC para consultar e organizar a programação das visitas de circuito." },
      { property: "og:title", content: "Visita SC — Acesso ao programa de visitas" },
      { property: "og:description", content: "Acesse o Visita SC para consultar e organizar a programação das visitas de circuito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  const { loading, user, needsOnboarding, role } = useAuth();
  const [guestCode, setGuestCode] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setGuestCode(readGuestSession()?.code ?? null);
  }, []);

  if (loading || guestCode === undefined) return <FullLoader />;
  if (user) {
    if (needsOnboarding) return <Navigate to="/onboarding" />;
    // Superintendente e todo ancião cadastrado abrem no Painel (com ou sem internet).
    const goDashboard = role === "superintendent" || role === "elder";
    return <Navigate to={goDashboard ? "/dashboard" : "/cronograma"} />;
  }
  if (guestCode) return <Navigate to="/visitante/painel" />;
  return <LoginForm />;
}

function FullLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
