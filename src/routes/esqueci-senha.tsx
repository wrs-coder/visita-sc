import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/esqueci-senha")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar o código", { description: error.message });
      return;
    }
    setStep("verify");
    toast.success("Código enviado!", { description: "Verifique seu e-mail." });
  };

  const verifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error("Informe o código de 6 dígitos."); return; }
    if (pwd.length < 6) { toast.error("A senha deve ter ao menos 6 caracteres."); return; }
    if (pwd !== confirm) { toast.error("As senhas não coincidem."); return; }
    setBusy(true);
    const { error: vErr } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "recovery",
    });
    if (vErr) {
      setBusy(false);
      toast.error("Código inválido ou expirado", { description: vErr.message });
      return;
    }
    const { error: uErr } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (uErr) { toast.error("Não foi possível redefinir", { description: uErr.message }); return; }
    toast.success("Senha redefinida!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center text-primary-foreground mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4 overflow-hidden">
            <Logo className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">
            {step === "request" ? "Enviaremos um código de 6 dígitos por e-mail" : "Insira o código recebido e defina sua nova senha"}
          </p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            {step === "request" ? (
              <form onSubmit={sendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail cadastrado</Label>
                  <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full h-11" disabled={busy}>
                  <Mail className="mr-2 h-4 w-4" /> {busy ? "Enviando..." : "Enviar código"}
                </Button>
                <Link to="/" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para o login
                </Link>
              </form>
            ) : (
              <form onSubmit={verifyAndReset} className="space-y-4">
                <div className="text-center text-sm text-muted-foreground">
                  Enviamos um código para <span className="font-medium text-foreground">{email}</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código de 6 dígitos</Label>
                  <Input id="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-lg tracking-[0.5em]" placeholder="000000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd">Nova senha</Label>
                  <Input id="pwd" type="password" required minLength={6} autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input id="confirm" type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" className="w-full h-11" disabled={busy}>
                  <KeyRound className="mr-2 h-4 w-4" /> {busy ? "Salvando..." : "Redefinir senha"}
                </Button>
                <button type="button" onClick={() => { setStep("request"); setCode(""); setPwd(""); setConfirm(""); }}
                  className="block w-full text-center text-sm text-muted-foreground hover:text-primary">
                  Não recebi — enviar novamente
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
