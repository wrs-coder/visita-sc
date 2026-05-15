import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { registerSuperintendent } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/cadastro/superintendente")({
  component: Page,
});

function Page() {
  const nav = useNavigate();
  const fn = useServerFn(registerSuperintendent);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", code: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fn({ data: form });
      if (!res.ok) { toast.error("Erro no cadastro", { description: res.error }); setBusy(false); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (error) { toast.error(error.message); setBusy(false); return; }
      toast.success("Conta criada!", { description: "Agora cadastre as congregações do seu circuito." });
      nav({ to: "/congregacoes" });
    } catch (err: unknown) {
      toast.error("Erro inesperado", { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-soft/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-primary-foreground/90 hover:text-primary-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Cadastro de Superintendente</h2>
                <p className="text-xs text-muted-foreground">Use o código de identificação fornecido</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <Field id="fullName" label="Nome completo" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
              <Field id="email" label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field id="password" label="Senha (mín. 6)" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              
              <Field id="code" label="Código de identificação" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
              <Button type="submit" className="w-full h-11 mt-2" disabled={busy}>
                {busy ? "Criando..." : "Criar conta de Superintendente"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text" }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} required value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
