import { useEffect, useState } from "react";
import { TermsDialog } from "@/components/auth/TermsDialog";
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
import { LogIn, Info, Mail, MessageCircle, UserCircle2, Coffee, Wifi, KeyRound } from "lucide-react";
import { getGuestSnapshot } from "@/lib/guest.functions";
import { Logo } from "@/components/Logo";
import { SupportDeveloperDialog } from "@/components/SupportDeveloper";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useConnectionMode, setMode } from "@/lib/connection-mode";
import { PinUnlockPanel } from "@/components/auth/PinUnlockPanel";
import { PinSetupDialog } from "@/components/auth/PinSetupDialog";
import { getVaultMeta, isVaultExpired, type VaultMeta } from "@/lib/offline-credentials";
import { guestLogin } from "@/lib/guest-login";
import { localDbStats } from "@/lib/local-db";
import { runFullSync } from "@/lib/local-auto-sync";

const APP_VERSION = "5.0.5";
const APP_BUILD = "2026.10.25";
const APP_UPDATED_AT = "24/10/2026";

const PIN_PROMPT_SKIP_KEY = "visita-sc:pin-prompt-skipped-at";
const PIN_PROMPT_SKIP_MS = 7 * 24 * 60 * 60 * 1000;

function pinPromptSkipped(): boolean {
  try {
    const raw = localStorage.getItem(PIN_PROMPT_SKIP_KEY);
    return !!raw && Date.now() - Number(raw) < PIN_PROMPT_SKIP_MS;
  } catch {
    return false;
  }
}

export function LoginForm() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const resolveFn = useServerFn(resolveLoginIdentifier);
  const guestFn = useServerFn(getGuestSnapshot);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);
  const usingCode = accessCode.trim().length > 0;
  const usingAccount = identifier.trim().length > 0 || password.length > 0;
  const [vault, setVault] = useState<VaultMeta | null>(null);
  const [usePassword, setUsePassword] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [wrongPwdOpen, setWrongPwdOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getVaultMeta().then((m) => {
      if (!alive) return;
      setVault(m && !isVaultExpired(m) ? m : null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const redirectByRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const roles = (data ?? []).map((r) => r.role);
    const toDashboard = roles.includes("superintendent") || roles.includes("elder");
    nav({ to: toDashboard ? "/dashboard" : "/cronograma" });
  };

  const mode = useConnectionMode();
  const offline = mode === "offline";
  const showPinPanel = !!vault && !usePassword;

  const finishLogin = async (userId: string) => {
    // Etapa A — primeiro acesso neste aparelho: oferece download completo em
    // segundo plano (espelho local vazio). Não bloqueia a navegação; falhas
    // são silenciosas e a sincronização diária continua funcionando.
    void (async () => {
      try {
        const stats = await localDbStats();
        if (stats.tables.length > 0) return;
        const tid = toast(t("sync.downloading", "Baixando seus dados para uso offline…"), { duration: Infinity });
        const results = await runFullSync();
        toast.dismiss(tid);
        if (results && results.every((r) => r.ok)) {
          toast.success(t("sync.downloadDone", "Download completo concluído"));
        }
      } catch { /* silencioso */ }
    })();
    await redirectByRole(userId);
  };

  const submitCode = async () => {
    const c = accessCode.replace(/[\s-]/g, "").toUpperCase();
    if (!/^[A-Z0-9]{4,12}\*?$/.test(c)) { toast.error(t("login.codeNotFound")); return; }
    setBusy(true);
    try {
      const res = await guestLogin(c, guestFn as never);
      if (res === "invalid") { toast.error(t("login.codeNotFound")); return; }
      if (res === "network") { toast.error(t("login.connectionError")); return; }
      nav({ to: "/visitante/painel" });
    } finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usingCode && !usingAccount) { await submitCode(); return; }
    if (offline) { toast.error(t("connection.firstLoginNeedsInternet")); return; }
    if (!identifier.trim() || !password) { toast.error(t("login.fillAccount")); return; }
    setBusy(true);
    let stage: "identifier" | "authentication" | "role" = "identifier";
    try {
      const r = await resolveFn({ data: { identifier: identifier.trim() } });
      if (!r.ok) { toast.error(r.error); return; }
      stage = "authentication";
      // Tenta a senha exatamente como digitada; se falhar e houver espaços
      // acidentais no início/fim, tenta de novo sem eles. Assim ninguém que
      // já usa a senha original deixa de conseguir entrar.
      let { data: signIn, error } = await supabase.auth.signInWithPassword({ email: r.email, password });
      const trimmed = password.trim();
      if ((error || !signIn.user) && trimmed && trimmed !== password) {
        ({ data: signIn, error } = await supabase.auth.signInWithPassword({ email: r.email, password: trimmed }));
      }
      if (error || !signIn.user) { setWrongPwdOpen(true); return; }
      toast.success(t("login.welcome"));
      const existing = await getVaultMeta();
      const sameUser = existing?.userId === signIn.user.id;
      if (!sameUser && !pinPromptSkipped()) {
        setPendingUserId(signIn.user.id);
        setPinSetupOpen(true);
        return;
      }
      stage = "role";
      await finishLogin(signIn.user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      console.warn(`[login] falha na etapa: ${stage}`);
      toast.error(
        message.includes("VISITASC_SERVER_FN_INCOMPATIBLE")
          ? t("login.incompatibleApp")
          : t("login.connectionError"),
      );
    } finally { setBusy(false); }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-1 gap-2">
          {offline ? (
            <button
              type="button"
              onClick={() => {
                setMode("online");
                toast.success(t("connection.nowOnline"));
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 text-primary-foreground text-xs font-medium px-2.5 py-1.5 backdrop-blur transition"
              title={t("connection.disableOfflineMode")}
            >
              <Wifi className="h-3.5 w-3.5" />
              <span>{t("connection.disableOfflineMode")}</span>
            </button>
          ) : (
            <div />
          )}
          <LanguageSwitcher variant="inverted" />
        </div>
        <div className="text-center text-primary-foreground mb-3">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-2 overflow-hidden">
            <Logo className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t("login.appTitle")}</h1>
          <div className="mt-1 text-base leading-snug">
            <div>{t("login.appSubtitle")}</div>
            <div>Atos 15:36; Rom 1:11,12</div>
          </div>
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="p-4">
            {showPinPanel && vault ? (
              <PinUnlockPanel
                meta={vault}
                onUsePassword={() => setUsePassword(true)}
                onUnlocked={() => nav({ to: "/" })}
                onVaultGone={() => {
                  setVault(null);
                  setUsePassword(true);
                }}
              />
            ) : (
              <>
            <form onSubmit={submit} className="space-y-2">
              <fieldset className={`space-y-2 transition-opacity ${usingCode ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <UserCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base leading-tight">{t("login.accountTitle")}</h2>
                    <p className="text-xs text-muted-foreground">{t("login.identifierHelp")}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="identifier">{t("login.identifierLabel")}</Label>
                  <Input
                    id="identifier"
                    type="text"
                    required={!usingCode}
                    autoComplete="username"
                    className="h-10"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pwd">{t("login.password")}</Label>
                  <Input id="pwd" type="password" required={!usingCode} autoComplete="current-password" className="h-10" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </fieldset>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>{t("login.or")}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <fieldset className={`space-y-1.5 transition-opacity ${usingAccount ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <Label htmlFor="access-code" className="font-semibold text-base leading-tight">{t("login.codeHelp")}</Label>
                </div>
                <Input
                  id="access-code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={20}
                  className="h-10 font-mono uppercase tracking-widest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
                  placeholder={t("login.codePlaceholder")}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                />
              </fieldset>

              <Button type="submit" className="w-full h-11" disabled={busy}>
                <LogIn className="mr-2 h-4 w-4" /> {busy ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>
            {vault ? (
              <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => setUsePassword(false)}>
                {t("offlinePin.unlock")}
              </Button>
            ) : null}
              </>
            )}

            <div className="mt-2 text-center text-sm">
              <Link to="/cadastro" className="text-primary font-medium hover:underline">{t("login.createAccount2")}</Link>
            </div>
            <div className="mt-2 pt-1.5 border-t flex items-center justify-center gap-2 text-[11px] text-muted-foreground whitespace-nowrap">
              <Link to="/politica-privacidade" className="hover:text-primary">{t("privacy.link")}</Link>
              <span className="opacity-50">·</span>
              <TermsDialog trigger={(open) => (<button type="button" onClick={open} className="hover:text-primary">Termos</button>)} />
              <span className="opacity-50">·</span>
              <SupportDeveloperDialog trigger={<button type="button" className="hover:text-primary">{t("login.support")}</button>} />
              <span className="opacity-50">·</span>
              <button type="button" className="hover:text-primary" onClick={() => setAboutOpen(true)}>{t("login.about")}</button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={wrongPwdOpen} onOpenChange={setWrongPwdOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("login.wrongPwdTitle")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t("login.wrongPwdBody")}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setWrongPwdOpen(false)}>{t("login.tryAgain")}</Button>
              <Button variant="outline" asChild><Link to="/esqueci-senha">{t("login.forgotPassword")}</Link></Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                {t("about.title")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{t("about.body")}</p>
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  {t("about.developmentLabel")}
                </p>
                <p className="text-sm mt-1 font-semibold text-foreground">
                  {t("about.developmentBody")}
                  <span className="text-primary"> Wanderson Rodrigues</span>.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  {t("about.supportLabel")}
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
                <span>{t("about.versionLine", { version: APP_VERSION, build: APP_BUILD })}</span>
                <span>{t("about.updated", { date: APP_UPDATED_AT })}</span>
              </div>
              <DialogClose asChild>
                <Button variant="outline" className="w-full">{t("about.close")}</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        <PinSetupDialog
          open={pinSetupOpen}
          onOpenChange={(v) => {
            setPinSetupOpen(v);
            if (!v && pendingUserId) {
              try { localStorage.setItem(PIN_PROMPT_SKIP_KEY, String(Date.now())); } catch { /* noop */ }
              const uid = pendingUserId;
              setPendingUserId(null);
              void finishLogin(uid);
            }
          }}
          onCreated={() => {
            try { localStorage.removeItem(PIN_PROMPT_SKIP_KEY); } catch { /* noop */ }
          }}
        />
      </div>

    </div>
  );
}
