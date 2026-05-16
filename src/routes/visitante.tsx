import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGuestSnapshot } from "@/lib/guest.functions";
import { saveGuestSession } from "@/lib/guest-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/visitante")({ component: Page });

function Page() {
  const nav = useNavigate();
  const fn = useServerFn(getGuestSnapshot);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}\*?$/.test(c)) { toast.error("Código inválido"); return; }
    setBusy(true);
    const r = await fn({ data: { inviteCode: c } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    saveGuestSession(c);
    nav({ to: "/visitante/painel" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center text-primary-foreground mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4 overflow-hidden">
            <Logo className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Acesso Corpo de anciãos e ES</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Visualização da programação da congregação</p>
        </div>
        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Eye className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-semibold text-lg leading-tight">Acesso somente leitura</h2>
                <p className="text-xs text-muted-foreground">Insira o código fornecido pelo superintendente</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="code">Código da congregação</Label>
                <Input id="code" className="mt-1 font-mono uppercase tracking-widest" maxLength={13}
                  value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EX: CENTRAL01" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                <Eye className="mr-2 h-4 w-4" /> Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
        <Link to="/" className="mt-4 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para o login
        </Link>
      </div>
    </div>
  );
}
