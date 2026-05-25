import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { registerSuperintendent } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/cadastro/superintendente")({
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const fn = useServerFn(registerSuperintendent);
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", code: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fn({ data: form });
      if (!res.ok) { toast.error(t("registerSuper.registerError"), { description: res.error }); setBusy(false); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (error) { toast.error(error.message); setBusy(false); return; }
      toast.success(t("registerSuper.successTitle"), { description: t("registerSuper.successDesc") });
      nav({ to: "/congregacoes" });
    } catch (err: unknown) {
      toast.error(t("registerSuper.unexpectedError"), { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-soft/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-primary-foreground/90 hover:text-primary-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("registerSuper.back")}
        </Link>
        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{t("registerSuper.heading")}</h2>
                <p className="text-xs text-muted-foreground">{t("registerSuper.subheading")}</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">{t("registerSuper.fullName")}</Label>
                <Input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("registerSuper.email")}</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("registerSuper.passwordLabel")}</Label>
                <div className="relative">
                  <Input id="password" type={showPwd ? "text" : "password"} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-10" />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label={showPwd ? t("registerSuper.hidePassword") : t("registerSuper.showPassword")}>
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">{t("registerSuper.code")}</Label>
                <Input id="code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <Button type="submit" className="w-full h-11 mt-2" disabled={busy}>
                {busy ? t("registerSuper.creating") : t("registerSuper.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
