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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useConnectionMode } from "@/lib/connection-mode";

const APP_VERSION = "3.0.0";
const APP_BUILD = "2026.05.28";
const APP_UPDATED_AT = "28/05/2026";

export function LoginForm() {
  const nav = useNavigate();
  const { t } = useTranslation();
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

  const mode = useConnectionMode();
  const offline = mode === "offline";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (offline) { toast.error(t("connection.firstLoginNeedsInternet")); return; }
    setBusy(true);
    try {
      const r = await resolveFn({ data: { identifier: identifier.trim() } });
      if (!r.ok) { toast.error(r.error); return; }
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email: r.email, password });
      if (error || !signIn.user) { toast.error(t("login.invalidCredentials")); return; }
      toast.success(t("login.welcome"));
      await redirectByRole(signIn.user.id);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher variant="inverted" />
        </div>
        <div className="text-center text-primary-foreground mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4 overflow-hidden">
            <Logo className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("login.appTitle")}</h1>
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-semibold text-lg leading-tight">{t("login.signIn")}</h2>
                <p className="text-xs text-muted-foreground">{t("login.identifierHelp")}</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="identifier">{t("login.identifierLabel")}</Label>
                <Input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t("login.identifierPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd">{t("login.password")}</Label>
                <Input id="pwd" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full h-11 mt-1" disabled={busy}>
                <LogIn className="mr-2 h-4 w-4" /> {busy ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>
            <div className="mt-4 space-y-1 text-center text-sm">
              <div>
                {t("login.newElder")}{" "}
                <Link to="/cadastro/anciao" className="text-primary font-medium hover:underline">{t("login.createAccessElder")}</Link>
              </div>
              <div>
                {t("login.newSuper")}{" "}
                <Link to="/cadastro/superintendente" className="text-primary font-medium hover:underline">{t("login.createAccount")}</Link>
              </div>
              <div className="pt-1">
                <Link to="/esqueci-senha" className="text-muted-foreground hover:text-primary text-[12px]">{t("login.forgotPassword")}</Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link to="/visitante" className="mt-4 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2">
          <Eye className="h-4 w-4" /> {t("login.guestAccess")}
        </Link>

        <SupportDeveloperDialog
          trigger={
            <button
              type="button"
              className="mt-1 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2"
            >
              <Coffee className="h-4 w-4" /> {t("login.supportDev")}
            </button>
          }
        />

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="mt-1 w-full text-sm text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center justify-center gap-2 py-2"
            >
              <Info className="h-4 w-4" /> {t("login.aboutApp")}
            </button>
          </DialogTrigger>
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
      </div>
    </div>
  );
}
