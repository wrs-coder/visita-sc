import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { readGuestSession } from "@/lib/guest-session";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  const { loading, user, needsOnboarding, role } = useAuth();
  const [guestCode, setGuestCode] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setGuestCode(readGuestSession());
  }, []);

  if (loading || guestCode === undefined) return <FullLoader />;
  if (user) {
    if (needsOnboarding) return <Navigate to="/onboarding" />;
    return <Navigate to={role === "superintendent" ? "/dashboard" : "/cronograma"} />;
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
