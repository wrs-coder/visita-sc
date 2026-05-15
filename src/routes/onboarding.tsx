import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, ELDER_POSITION_LABELS, type ElderPosition } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { linkAccount } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/onboarding")({ component: Page });

function Page() {
  const { user, loading, refresh, signOut } = useAuth();
  const fn = useServerFn(linkAccount);
  const nav = useNavigate();
  const [mode, setMode] = useState<"superintendent" | "elder" | null>(null);
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState<ElderPosition | "">("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) { nav({ to: "/" }); return null; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode) return;
    if (mode === "elder" && !position) { toast.error("Selecione sua designação."); return; }
    setBusy(true);
    const res = await fn({ data: { mode, code, fullName: fullName || undefined, position: mode === "elder" ? (position as ElderPosition) : undefined } });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(mode === "superintendent" ? "Conta criada! Agora cadastre as congregações do circuito." : "Bem-vindo à congregação!");
    await refresh();
    nav({ to: mode === "superintendent" ? "/congregacoes" : "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-soft/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2">Vamos configurar sua conta</h2>
          <p className="text-sm text-muted-foreground mb-5">Escolha como deseja participar:</p>

          {!mode && (
            <div className="grid gap-3">
              <button onClick={() => setMode("superintendent")} className="flex items-start gap-3 p-4 border rounded-xl text-left hover:border-primary hover:bg-primary/5 transition">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                <div><div className="font-medium">Sou Superintendente</div><div className="text-xs text-muted-foreground">Cadastrar congregações do circuito (precisa do código)</div></div>
              </button>
              <button onClick={() => setMode("elder")} className="flex items-start gap-3 p-4 border rounded-xl text-left hover:border-primary hover:bg-primary/5 transition">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div><div className="font-medium">Sou Ancião</div><div className="text-xs text-muted-foreground">Entrar com código da congregação</div></div>
              </button>
              <button onClick={() => signOut().then(() => nav({ to: "/" }))} className="text-xs text-muted-foreground mt-2 hover:underline">Sair</button>
            </div>
          )}

          {mode && (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fn">Nome completo</Label>
                <Input id="fn" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">{mode === "superintendent" ? "Código de identificação" : "Código da congregação"}</Label>
                <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              {mode === "elder" && (
                <div className="space-y-1.5">
                  <Label htmlFor="pos">Designação</Label>
                  <Select value={position} onValueChange={(v) => setPosition(v as ElderPosition)}>
                    <SelectTrigger id="pos"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ELDER_POSITION_LABELS) as ElderPosition[]).map((k) => (
                        <SelectItem key={k} value={k}>{ELDER_POSITION_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Coordenador, Secretário e Sup. de Serviço podem editar; Corpo de Anciãos apenas visualiza.</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setMode(null)} className="flex-1">Voltar</Button>
                <Button type="submit" disabled={busy} className="flex-1">{busy ? "Aguarde..." : "Continuar"}</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
