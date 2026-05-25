import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { registerElderByUsername, getAvailableElderPositions } from "@/lib/auth.functions";
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
  const { t } = useTranslation();
  const nav = useNavigate();
  const fn = useServerFn(registerElderByUsername);
  const checkFn = useServerFn(getAvailableElderPositions);
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [form, setForm] = useState<{ username: string; phone: string; password: string; inviteCode: string; position: ElderPosition | "" }>({
    username: "", phone: "", password: "", inviteCode: "", position: "",
  });
  const [available, setAvailable] = useState<ElderPosition[] | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.position) { toast.error(t("registerElder.selectPosition")); return; }
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(form.username.trim())) {
      toast.error(t("registerElder.invalidUsername"), { description: t("registerElder.invalidUsernameDesc") });
      return;
    }
    setBusy(true);
    try {
      const fullPhone = buildFullPhone(country, form.phone);
      const res = await fn({ data: {
        username: form.username.trim().toLowerCase(),
        phone: fullPhone,
        password: form.password,
        inviteCode: form.inviteCode.toUpperCase(),
        position: form.position,
      } });
      if (!res.ok) { toast.error(t("registerElder.registerError"), { description: res.error }); setBusy(false); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: res.email, password: form.password });
      if (error) { toast.error(error.message); setBusy(false); return; }
      toast.success(t("registerElder.successTitle"), { description: t("registerElder.successDesc") });
      nav({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(t("registerElder.unexpectedError"), { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  };

  useEffect(() => {
    const code = form.inviteCode.trim();
    if (code.length < 4) {
      setAvailable(null);
      setCodeError(null);
      return;
    }
    setChecking(true);
    const handle = setTimeout(async () => {
      try {
        const res = await checkFn({ data: { inviteCode: code } });
        if (!res.ok) {
          setAvailable([]);
          setCodeError(res.error);
          setForm((f) => ({ ...f, position: "" }));
        } else {
          setAvailable(res.available as ElderPosition[]);
          setCodeError(null);
          setForm((f) => (f.position && !(res.available as string[]).includes(f.position) ? { ...f, position: "" } : f));
        }
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [form.inviteCode, checkFn]);

  const dial = findCountry(country).dial;
  const allFilled = available !== null && available.length === 0 && !codeError;
  const disableSubmit = busy || !!codeError || allFilled || !form.position || available === null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-soft/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-primary-foreground/90 hover:text-primary-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("registerElder.back")}
        </Link>
        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{t("registerElder.heading")}</h2>
                <p className="text-xs text-muted-foreground">{t("registerElder.subheading")}</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("registerElder.country")}</Label>
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
                <Label htmlFor="phone">{t("registerElder.phone")}</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">+{dial}</div>
                  <Input id="phone" type="tel" inputMode="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t("registerElder.phonePlaceholder")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">{t("registerElder.username")}</Label>
                <Input
                  id="username"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "") })}
                  placeholder={t("registerElder.usernamePlaceholder")}
                  minLength={3}
                  maxLength={30}
                />
                <p className="text-[11px] text-muted-foreground">{t("registerElder.usernameHelp")}</p>
              </div>

              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} />

              <div className="space-y-1.5">
                <Label htmlFor="code">{t("registerElder.inviteCode")}</Label>
                <Input id="code" required value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })} />
                {checking && <p className="text-[11px] text-muted-foreground">{t("registerElder.checking")}</p>}
                {codeError && <p className="text-[11px] text-destructive">{codeError}</p>}
                {allFilled && (
                  <p className="text-[12px] text-destructive font-medium">
                    {t("registerElder.allFilled")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pos">{t("registerElder.positionLabel")}</Label>
                <Select
                  value={form.position}
                  onValueChange={(v) => setForm({ ...form, position: v as ElderPosition })}
                  disabled={available === null || allFilled || !!codeError}
                >
                  <SelectTrigger id="pos"><SelectValue placeholder={available === null ? t("registerElder.positionTypeCodeFirst") : t("registerElder.positionPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {(available ?? ALL_POSITIONS).map((k) => (
                      <SelectItem key={k} value={k}>{ELDER_POSITION_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">{t("registerElder.positionHelp")}</p>
              </div>

              <Button type="submit" className="w-full h-11 mt-2" disabled={disableSubmit}>
                {busy ? t("registerElder.creating") : t("registerElder.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor="password">{t("registerElder.passwordLabel")}</Label>
      <div className="relative">
        <Input id="password" type={show ? "text" : "password"} required value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label={show ? t("registerElder.hidePassword") : t("registerElder.showPassword")}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
