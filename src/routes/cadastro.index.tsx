import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { checkSignupCode } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";
import { HowToGetCode } from "@/components/auth/HowToGetCode";

export const Route = createFileRoute("/cadastro/")({
  head: () => ({
    meta: [
      { title: "Criar conta — Visita SC" },
      { name: "description", content: "Crie sua conta no Visita SC com o código recebido." },
      { property: "og:title", content: "Criar conta — Visita SC" },
      { property: "og:description", content: "Crie sua conta no Visita SC com o código recebido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const fn = useServerFn(checkSignupCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\s/g, "");
    if (!c) return;
    setBusy(true);
    try {
      const r = await fn({ data: { code: c } });
      if (r.kind === "super") window.location.assign(`/cadastro/superintendente?code=${encodeURIComponent(c)}`);
      else if (r.kind === "elder") window.location.assign(`/cadastro/anciao?code=${encodeURIComponent(c.toUpperCase())}`);
      else toast.error(t("login.signupCodeInvalid"));
    } catch {
      toast.error(t("login.connectionError"));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-soft/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button type="button" onClick={() => nav({ to: "/" })} className="inline-flex items-center text-sm text-primary-foreground/90 hover:text-primary-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("registerSuper.back")}
        </button>
        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">{t("login.signupTitle")}</h1>
                <p className="text-xs text-muted-foreground">{t("login.signupHelp")}</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="signup-code">{t("login.signupCodeLabel")}</Label>
                <Input id="signup-code" required autoComplete="off" className="h-11 font-mono tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} />
                <HowToGetCode />
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>{t("login.continue")}</Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground"><Link to="/" className="hover:text-primary">{t("login.signIn")}</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
