import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/consideracoes-campo")({
  beforeLoad: async () => {
    // Guard: only superintendent. Other roles redirect to dashboard.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isSuper = (roles ?? []).some((r) => r.role === "superintendent");
      if (!isSuper) throw redirect({ to: "/dashboard" });
    } catch (e) {
      // re-throw redirect; ignore other errors (offline mode handled by layout)
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{t("fieldConsiderations.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("fieldConsiderations.subtitle")}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("fieldConsiderations.placeholder")}
        </CardContent>
      </Card>
    </div>
  );
}
