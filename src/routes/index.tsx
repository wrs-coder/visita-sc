import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { readGuestSession } from "@/lib/guest-session";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  const { loading, user, needsOnboarding, role, elderPosition } = useAuth();
  const [guestCode, setGuestCode] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setGuestCode(readGuestSession()?.code ?? null);
  }, []);

  if (loading || guestCode === undefined) return <FullLoader />;
  if (user) {
    if (needsOnboarding) return <Navigate to="/onboarding" />;
    const goDashboard =
      role === "superintendent" ||
      (role === "elder" && (elderPosition === "coordenador" || elderPosition === "secretario" || elderPosition === "sup_servico"));
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
