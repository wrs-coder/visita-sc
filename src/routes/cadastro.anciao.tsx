import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { registerElderByPhone, getAvailableElderPositions } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, DEFAULT_COUNTRY, buildFullPhone, findCountry } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { ELDER_POSITION_LABELS, type ElderPosition } from "@/hooks/use-auth";

export const Route = createFileRoute("/cadastro/anciao")({ component: Page });

const ALL_POSITIONS: ElderPosition[] = ["coordenador", "secretario", "sup_servico"];

function Page() {
  const nav = useNavigate();
  const fn = useServerFn(registerElderByPhone);
  const checkFn = useServerFn(getAvailableElderPositions);
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [form, setForm] = useState<{ fullName: string; phone: string; email: string; password: string; inviteCode: string; position: ElderPosition | "" }>({
    fullName: "", phone: "", email: "", password: "", inviteCode: "", position: "",
  });
  const [available, setAvailable] = useState<ElderPosition[] | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.position) { toast.error("Selecione sua designação."); return; }
    setBusy(true);
    try {
      const fullPhone = buildFullPhone(country, form.phone);
      const res = await fn({ data: {
        fullName: form.fullName,
        phone: fullPhone,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        inviteCode: form.inviteCode.toUpperCase(),
        position: form.position,
      } });
      if (!res.ok) { toast.error("Erro no cadastro", { description: res.error }); setBusy(false); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: res.email, password: form.password });
      if (error) { toast.error(error.message); setBusy(false); return; }
      toast.success("Cadastro concluído!");
      nav({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error("Erro inesperado", { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  };

  const dial = findCountry(country).dial;

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
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Cadastro de Ancião</h2>
                <p className="text-xs text-muted-foreground">Telefone, e-mail, designação e código</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <Field id="fullName" label="Nome completo" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />

              <div className="space-y-1.5">
                <Label>País</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} (+{c.dial})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">+{dial}</div>
                  <Input id="phone" type="tel" inputMode="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="número com DDD" />
                </div>
              </div>

              <Field id="email" label="E-mail (para recuperar senha)" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              <Field id="code" label="Código da congregação" value={form.inviteCode} onChange={(v) => setForm({ ...form, inviteCode: v.toUpperCase() })} />
              <div className="space-y-1.5">
                <Label htmlFor="pos">Designação no corpo de anciãos</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v as ElderPosition })}>
                  <SelectTrigger id="pos"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {(["coordenador", "secretario", "sup_servico"] as ElderPosition[]).map((k) => (
                      <SelectItem key={k} value={k}>{ELDER_POSITION_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Cadastro disponível apenas para Coordenador, Secretário e Sup. de Serviço. Os demais anciãos e a ES usam o acesso "Corpo de anciãos e ES" no login.</p>
              </div>
              <Button type="submit" className="w-full h-11 mt-2" disabled={busy}>
                {busy ? "Criando..." : "Entrar na Congregação"}
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

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor="password">Defina uma senha (mín. 6)</Label>
      <div className="relative">
        <Input id="password" type={show ? "text" : "password"} required value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
