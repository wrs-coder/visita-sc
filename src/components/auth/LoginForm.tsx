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
  const resolveFn = useServerFn(resolveElderEmail);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSuper, setShowSuper] = useState(false);
  const [superEmail, setSuperEmail] = useState("");
  const [superPwd, setSuperPwd] = useState("");

  const redirectByRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    const roles = (data ?? []).map((r) => r.role);
    const isSuper = roles.includes("superintendent");
    nav({ to: isSuper ? "/dashboard" : "/cronograma" });
  };

  const submitElder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fullPhone = buildFullPhone(country, phone);
      const r = await resolveFn({ data: { phone: fullPhone } });
      if (!r.ok) { toast.error(r.error); return; }
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email: r.email, password });
      if (error || !signIn.user) { toast.error("Senha incorreta"); return; }
      toast.success("Bem-vindo!");
      await redirectByRole(signIn.user.id);
    } finally { setBusy(false); }
  };

  const submitSuper = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email: superEmail.trim(), password: superPwd });
      if (error || !signIn.user) { toast.error("Não foi possível entrar", { description: error?.message }); return; }
      toast.success("Bem-vindo!");
      await redirectByRole(signIn.user.id);
    } finally { setBusy(false); }
  };

  const dial = findCountry(country).dial;

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
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">Acesso do Ancião</h2>
                    <p className="text-xs text-muted-foreground">Entre com seu telefone e senha</p>
                  </div>
                </div>
                <form onSubmit={submitElder} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>País</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.name} (+{c.dial})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                        +{dial}
                      </div>
                      <Input id="phone" type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="número com DDD" />
                    </div>
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
                <div className="mt-2 text-center text-[12px]">
                  <Link to="/esqueci-senha" className="text-muted-foreground hover:text-primary">Esqueci minha senha</Link>
                </div>
              </CardContent>
            </Card>

            <button onClick={() => setShowSuper(true)} className="mt-4 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2">
              <ShieldCheck className="h-4 w-4" /> Sou superintendente
            </button>
            <Link to="/visitante" className="mt-1 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2">
              <Eye className="h-4 w-4" /> Acesso Corpo de anciãos e ES
            </Link>
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
