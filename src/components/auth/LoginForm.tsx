import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { resolveLoginIdentifier } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogIn, Eye, Info, Mail, MessageCircle, UserCircle2, Coffee } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SupportDeveloperDialog } from "@/components/SupportDeveloper";

const APP_VERSION = "2.1.0";
const APP_BUILD = "2026.05.21";
const APP_UPDATED_AT = "21/05/2026";

export function LoginForm() {
  const nav = useNavigate();
  const resolveFn = useServerFn(resolveLoginIdentifier);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await resolveFn({ data: { identifier: identifier.trim() } });
      if (!r.ok) { toast.error(r.error); return; }
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email: r.email, password });
      if (error || !signIn.user) { toast.error("Credenciais inválidas"); return; }
      toast.success("Bem-vindo!");
      await redirectByRole(signIn.user.id);
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
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-semibold text-lg leading-tight">Entrar</h2>
                <p className="text-xs text-muted-foreground">Utilizador, e-mail ou ID do circuito</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="identifier">Utilizador / E-mail / ID do Circuito</Label>
                <Input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ex: joao_silva, joao@email.com ou AGO-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd">Senha</Label>
                <Input id="pwd" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full h-11 mt-1" disabled={busy}>
                <LogIn className="mr-2 h-4 w-4" /> {busy ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            <div className="mt-4 space-y-1 text-center text-sm">
              <div>
                Sou ancião novo —{" "}
                <Link to="/cadastro/anciao" className="text-primary font-medium hover:underline">criar acesso</Link>
              </div>
              <div>
                Sou superintendente novo —{" "}
                <Link to="/cadastro/superintendente" className="text-primary font-medium hover:underline">criar conta</Link>
              </div>
              <div className="pt-1">
                <Link to="/esqueci-senha" className="text-muted-foreground hover:text-primary text-[12px]">Esqueci minha senha</Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link to="/visitante" className="mt-4 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2">
          <Eye className="h-4 w-4" /> Acesso Corpo de anciãos e ES
        </Link>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="mt-1 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2"
            >
              <Info className="h-4 w-4" /> Sobre o Aplicativo
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Sobre o Aplicativo
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                O objetivo deste sistema é prover uma plataforma integrada para a gestão de
                informações e relatórios do painel. Através da automação de processos, o
                aplicativo visa simplificar as rotinas, assegurar a integridade dos dados
                compartilhados e facilitar o suporte às atividades na semana da visita à
                congregação.
              </p>
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Desenvolvimento
                </p>
                <p className="text-sm mt-1 font-semibold text-foreground">
                  Sistema totalmente idealizado, estruturado e programado de forma independente por
                  <span className="text-primary"> Wanderson Rodrigues</span>.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Suporte
                </p>
                <a
                  href="mailto:wrscircuito@gmail.com"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  wrscircuito@gmail.com
                </a>
                <a
                  href="https://wa.me/5571983420366"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-primary" />
                  WhatsApp: 71 98342-0366
                </a>
              </div>
              <div className="border-t pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Versão {APP_VERSION} · Build {APP_BUILD}</span>
                <span>Atualizado: {APP_UPDATED_AT}</span>
              </div>
              <DialogClose asChild>
                <Button variant="outline" className="w-full">Fechar</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
