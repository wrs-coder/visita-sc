import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lookupRecoverableEmail } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/esqueci-senha")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const lookupFn = useServerFn(lookupRecoverableEmail);
  const [identifier, setIdentifier] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [noEmailAlert, setNoEmailAlert] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await lookupFn({ data: { identifier: identifier.trim() } });
      if (!r.ok) {
        setNoEmailAlert(true);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(r.email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) {
        toast.error(t("forgotPassword.errSend"), { description: error.message });
        return;
      }
      setResolvedEmail(r.email);
      setStep("verify");
      toast.success(t("forgotPassword.successCodeSent"), { description: t("forgotPassword.checkEmail") });
    } finally { setBusy(false); }
  };

  const verifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error(t("forgotPassword.errCodeFormat")); return; }
    if (pwd.length < 6) { toast.error(t("forgotPassword.errPwdShort")); return; }
    if (pwd !== confirm) { toast.error(t("forgotPassword.errPwdMismatch")); return; }
    setBusy(true);
    const { error: vErr } = await supabase.auth.verifyOtp({
      email: resolvedEmail,
      token: code,
      type: "recovery",
    });
    if (vErr) {
      setBusy(false);
      toast.error(t("forgotPassword.errCodeInvalid"), { description: vErr.message });
      return;
    }
    const { error: uErr } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (uErr) { toast.error(t("forgotPassword.errReset"), { description: uErr.message }); return; }
    toast.success(t("forgotPassword.successReset"));
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center text-primary-foreground mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4 overflow-hidden">
            <Logo className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("forgotPassword.title")}</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">
            {step === "request" ? t("forgotPassword.subtitleRequest") : t("forgotPassword.subtitleVerify")}
          </p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            {step === "request" ? (
              <form onSubmit={sendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">{t("forgotPassword.identifierLabel")}</Label>
                  <Input id="identifier" required autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                </div>
                <Button type="submit" className="w-full h-11" disabled={busy}>
                  <Mail className="mr-2 h-4 w-4" /> {busy ? t("forgotPassword.verifying") : t("forgotPassword.sendCode")}
                </Button>
                <Link to="/" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="h-4 w-4 mr-1" /> {t("forgotPassword.backToLogin")}
                </Link>
              </form>
            ) : (
              <form onSubmit={verifyAndReset} className="space-y-4">
                <div className="text-center text-sm text-muted-foreground">
                  {t("forgotPassword.sentTo")} <span className="font-medium text-foreground">{resolvedEmail}</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">{t("forgotPassword.codeLabel")}</Label>
                  <Input id="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-lg tracking-[0.5em]" placeholder="000000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd">{t("forgotPassword.newPassword")}</Label>
                  <Input id="pwd" type="password" required minLength={6} autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">{t("forgotPassword.confirmPassword")}</Label>
                  <Input id="confirm" type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" className="w-full h-11" disabled={busy}>
                  <KeyRound className="mr-2 h-4 w-4" /> {busy ? t("forgotPassword.saving") : t("forgotPassword.resetPassword")}
                </Button>
                <button type="button" onClick={() => { setStep("request"); setCode(""); setPwd(""); setConfirm(""); }}
                  className="block w-full text-center text-sm text-muted-foreground hover:text-primary">
                  {t("forgotPassword.resend")}
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={noEmailAlert} onOpenChange={setNoEmailAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("forgotPassword.noEmailTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("forgotPassword.noEmailDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setNoEmailAlert(false)}>{t("forgotPassword.understood")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
