import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getGuestSnapshot } from "@/lib/guest.functions";
import { saveGuestSession } from "@/lib/guest-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Users, ShieldCheck, KeyRound } from "lucide-react";
import { Logo } from "@/components/Logo";

export function LoginForm() {
  const nav = useNavigate();
  const guestFn = useServerFn(getGuestSnapshot);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSuper, setShowSuper] = useState(false);
  const [superEmail, setSuperEmail] = useState("");
  const [superPwd, setSuperPwd] = useState("");

  const submitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}\*?$/.test(c)) {
      toast.error("Código inválido", { description: "Use o código fornecido pelo superintendente (4 a 12 caracteres)." });
      return;
    }
    setBusy(true);
    try {
      const r = await guestFn({ data: { inviteCode: c } });
      if (!r.ok) { toast.error(r.error); return; }
      saveGuestSession(c);
      toast.success(r.wifeMode ? "Bem-vinda!" : "Bem-vindo!");
      nav({ to: "/visitante/painel" });
    } finally { setBusy(false); }
  };

  const submitSuper = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email: superEmail.trim(), password: superPwd });
      if (error || !signIn.user) { toast.error("Não foi possível entrar", { description: error?.message }); return; }
      toast.success("Bem-vindo!");
      nav({ to: "/dashboard" });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center text-primary-foreground mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4 overflow-hidden">
            <Logo className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Visita do Superintendente</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Gestão e colaboração para sua congregação</p>
        </div>

        {!showSuper ? (
          <>
            <Card className="shadow-elevated border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">Acesso por código</h2>
                    <p className="text-xs text-muted-foreground">Corpo de anciãos e Esposa do Superintendente</p>
                  </div>
                </div>
                <form onSubmit={submitGuest} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Código da congregação</Label>
                    <Input
                      id="code"
                      className="font-mono uppercase tracking-widest text-center text-base"
                      maxLength={13}
                      autoComplete="off"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="EX: CENTRAL01"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Esposa do superintendente: adicione <span className="font-mono">*</span> ao final do código.
                    </p>
                  </div>
                  <Button type="submit" className="w-full h-11 mt-1" disabled={busy}>
                    <LogIn className="mr-2 h-4 w-4" /> Entrar
                  </Button>
                </form>
              </CardContent>
            </Card>

            <button onClick={() => setShowSuper(true)} className="mt-4 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2">
              <ShieldCheck className="h-4 w-4" /> Sou superintendente
            </button>
          </>
        ) : (
          <>
            <Card className="shadow-elevated border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">Acesso do Superintendente</h2>
                    <p className="text-xs text-muted-foreground">Entre com e-mail e senha</p>
                  </div>
                </div>
                <form onSubmit={submitSuper} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" required autoComplete="email" value={superEmail} onChange={(e) => setSuperEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="spwd">Senha</Label>
                    <Input id="spwd" type="password" required autoComplete="current-password" value={superPwd} onChange={(e) => setSuperPwd(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full h-11 mt-1" disabled={busy}>
                    <LogIn className="mr-2 h-4 w-4" /> Entrar
                  </Button>
                </form>
                <div className="mt-4 text-center space-y-1 text-sm">
                  <div><Link to="/esqueci-senha" className="text-primary hover:underline">Esqueci minha senha</Link></div>
                  <div>Sou superintendente novo — <Link to="/cadastro/superintendente" className="text-primary font-medium hover:underline">criar conta</Link></div>
                </div>
              </CardContent>
            </Card>

            <button onClick={() => setShowSuper(false)} className="mt-4 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2">
              <Users className="h-4 w-4" /> Voltar para acesso do ancião
            </button>
          </>
        )}
      </div>
    </div>
  );
}
