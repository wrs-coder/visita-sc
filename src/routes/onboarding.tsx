import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth, ELDER_POSITION_LABELS, type ElderPosition } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { linkAccount } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Page });

function Page() {
  const { t } = useTranslation();
  const { user, loading, refresh, signOut, needsOnboarding, role } = useAuth();
  const fn = useServerFn(linkAccount);
  const nav = useNavigate();
  const [step, setStep] = useState<"code" | "elder-position">("code");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState<ElderPosition | "">("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) { nav({ to: "/" }); return null; }
  // Conta já possui role/congregação configurada — não exibir o onboarding
  // novamente. Esse guard evita o card duplicado após login/cadastro.
  if (!needsOnboarding) {
    const goDashboard = role === "superintendent";
    nav({ to: goDashboard ? "/dashboard" : "/cronograma", replace: true });
    return null;
  }

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setBusy(true);
    const superRes = await fn({ data: { mode: "superintendent", code: trimmed, fullName: fullName || undefined } });
    if (superRes.ok) {
      setBusy(false);
      toast.success(t("onboarding.superCreated"));
      await refresh();
      nav({ to: "/congregacoes" });
      return;
    }

    const { data: cong } = await supabase
      .from("congregations")
      .select("id,is_active")
      .eq("invite_code", trimmed.toUpperCase())
      .maybeSingle();
    setBusy(false);

    if (!cong) { toast.error(t("onboarding.invalidCode")); return; }
    if (!cong.is_active) { toast.error(t("onboarding.inactiveCongregation")); return; }
    setStep("elder-position");
  };

  const submitElder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) { toast.error(t("onboarding.selectPosition")); return; }
    setBusy(true);
    const res = await fn({ data: { mode: "elder", code: code.trim(), fullName: fullName || undefined, position: position as ElderPosition } });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(t("onboarding.welcome"));
    await refresh();
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-soft/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2">{t("onboarding.title")}</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {step === "code" ? t("onboarding.subtitleCode") : t("onboarding.subtitleElder")}
          </p>

          {step === "code" && (
            <form onSubmit={submitCode} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fn">{t("onboarding.fullName")}</Label>
                <Input id="fn" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">{t("onboarding.code")}</Label>
                <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("onboarding.codePlaceholder")} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => signOut().then(() => nav({ to: "/" }))} className="flex-1">{t("onboarding.exit")}</Button>
                <Button type="submit" disabled={busy} className="flex-1">{busy ? t("onboarding.wait") : t("onboarding.continue")}</Button>
              </div>
            </form>
          )}

          {step === "elder-position" && (
            <form onSubmit={submitElder} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pos">{t("onboarding.position")}</Label>
                <Select value={position} onValueChange={(v) => setPosition(v as ElderPosition)}>
                  <SelectTrigger id="pos"><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ELDER_POSITION_LABELS) as ElderPosition[]).map((k) => (
                      <SelectItem key={k} value={k}>{ELDER_POSITION_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">{t("onboarding.positionHelp")}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep("code")} className="flex-1">{t("onboarding.back")}</Button>
                <Button type="submit" disabled={busy} className="flex-1">{busy ? t("onboarding.wait") : t("onboarding.enter")}</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
