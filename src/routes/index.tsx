import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  const { loading, user, needsOnboarding, role } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <LoginForm />;
  if (needsOnboarding) return <Navigate to="/onboarding" />;
  return <Navigate to={role === "superintendent" ? "/dashboard" : "/cronograma"} />;
}

function FullLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
