import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { resolveElderEmail } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Compass, LogIn, Users, ShieldCheck } from "lucide-react";

export function LoginForm() {
  const nav = useNavigate();
  const resolveFn = useServerFn(resolveElderEmail);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSuper, setShowSuper] = useState(false);
  const [superEmail, setSuperEmail] = useState("");
  const [superPwd, setSuperPwd] = useState("");

  const submitElder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await resolveFn({ data: { phone } });
      if (!r.ok) { toast.error(r.error); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: r.email, password });
      if (error) { toast.error("Senha incorreta"); return; }
      toast.success("Bem-vindo!");
      nav({ to: "/dashboard" });
    } finally { setBusy(false); }
  };

  const submitSuper = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: superEmail.trim(), password: superPwd });
    setBusy(false);
    if (error) { toast.error("Não foi possível entrar", { description: error.message }); return; }
    toast.success("Bem-vindo!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center text-primary-foreground mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4">
            <Compass className="h-7 w-7" />
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
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">Acesso do Ancião</h2>
                    <p className="text-xs text-muted-foreground">Entre com seu telefone e senha</p>
                  </div>
                </div>
                <form onSubmit={submitElder} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone (com DDD)</Label>
                    <Input id="phone" type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pwd">Senha</Label>
                    <Input id="pwd" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full h-11 mt-1" disabled={busy}>
                    <LogIn className="mr-2 h-4 w-4" /> Entrar
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                  Sou ancião novo —{" "}
                  <Link to="/cadastro/anciao" className="text-primary font-medium hover:underline">criar acesso</Link>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground text-center">
                  Esqueceu a senha? Peça ao superintendente para redefinir.
                </p>
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
