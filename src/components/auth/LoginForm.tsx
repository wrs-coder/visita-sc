import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Compass, LogIn } from "lucide-react";

export function LoginForm() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { toast.error("Não foi possível entrar", { description: error.message }); return; }
    toast.success("Bem-vindo!");
    nav({ to: "/dashboard" });
  };

  const google = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Falha no login com Google", { description: r.error.message }); setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center text-primary-foreground mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4">
            <Compass className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Visita do Superintendente</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Gestão e colaboração para sua congregação</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd">Senha</Label>
                <Input id="pwd" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                <LogIn className="mr-2 h-4 w-4" /> Entrar
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px bg-border flex-1" /> ou <div className="h-px bg-border flex-1" />
            </div>

            <Button type="button" variant="outline" className="w-full h-11" onClick={google} disabled={busy}>
              <GoogleIcon /> Continuar com Google
            </Button>

            <div className="mt-4 text-center">
              <a href="/esqueci-senha" className="text-sm text-primary hover:underline">Esqueci minha senha</a>
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground space-y-1">
              <div>
                Sou superintendente —{" "}
                <a href="/cadastro/superintendente" className="text-primary font-medium hover:underline">criar conta</a>
              </div>
              <div>
                Sou ancião —{" "}
                <a href="/cadastro/anciao" className="text-primary font-medium hover:underline">entrar com código</a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}
