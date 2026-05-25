import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/redefinir-senha")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error(t("resetPassword.errPwdShort")); return; }
    if (pwd !== confirm) { toast.error(t("resetPassword.errPwdMismatch")); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) {
      toast.error(t("resetPassword.errUpdate"), { description: error.message });
      return;
    }
    toast.success(t("resetPassword.success"), { description: t("resetPassword.successDesc") });
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center text-primary-foreground mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4 overflow-hidden">
            <Logo className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("resetPassword.title")}</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">{t("resetPassword.subtitle")}</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            {!ready ? (
              <p className="text-sm text-muted-foreground text-center">{t("resetPassword.validating")}</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pwd">{t("resetPassword.newPassword")}</Label>
                  <Input id="pwd" type="password" required minLength={6} autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">{t("resetPassword.confirmPassword")}</Label>
                  <Input id="confirm" type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" className="w-full h-11" disabled={busy}>
                  <KeyRound className="mr-2 h-4 w-4" /> {busy ? t("resetPassword.saving") : t("resetPassword.submit")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
