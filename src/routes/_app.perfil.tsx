import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useAutoBackup } from "@/hooks/use-auto-backup";
import { supabase } from "@/integrations/supabase/client";
import { exportFullBackup, restoreFullBackup } from "@/lib/backup.functions";
import { shareJsonFile, readJsonFile, pickFile } from "@/lib/share";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { User as UserIcon, Mail, KeyRound, ShieldCheck, Download, Upload, Loader2, Coffee, Globe } from "lucide-react";
import { SupportDeveloperContent } from "@/components/SupportDeveloper";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/perfil")({ component: Page });

function Page() {
  const { user, profile, refresh, role } = useAuth();
  const { t } = useTranslation();
  const autoBackup = useAutoBackup();
  const fnExportBackup = useServerFn(exportFullBackup);
  const fnRestoreBackup = useServerFn(restoreFullBackup);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<unknown | null>(null);
  const [busyBackup, setBusyBackup] = useState<null | "export" | "restore">(null);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [circuit, setCircuit] = useState(profile?.circuit ?? "");
  const [email, setEmail] = useState(user?.email ?? profile?.email ?? "");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busyName, setBusyName] = useState(false);
  const [busyCircuit, setBusyCircuit] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPwd, setBusyPwd] = useState(false);

  const doExportBackup = async () => {
    setBusyBackup("export");
    const r = await fnExportBackup();
    setBusyBackup(null);
    if (!r.ok || !r.file) { toast.error(r.error ?? t("profile.failGeneric")); return; }
    const fname = `visita-sc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const res = await shareJsonFile(fname, r.file);
    toast.success(res === "shared" ? t("profile.shareOpened") : t("profile.backupDownloaded"));
  };

  const pickRestoreFile = async (file: File) => {
    try {
      const json = await readJsonFile(file);
      setPendingRestore(json);
    } catch (e) {
      toast.error(t("profile.invalidFile"), { description: (e as Error).message });
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    setBusyBackup("restore");
    const r = await fnRestoreBackup({ data: { file: pendingRestore as never } });
    setBusyBackup(null);
    setPendingRestore(null);
    if (!r.ok) { toast.error(t("profile.restoreFail"), { description: r.error }); return; }
    toast.success(t("profile.restoredCount", { count: r.restored }));
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusyName(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    setBusyName(false);
    if (error) { toast.error(t("profile.saveError"), { description: error.message }); return; }
    toast.success(t("profile.nameUpdated"));
    refresh();
  };

  const saveCircuit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusyCircuit(true);
    const { error } = await supabase.from("profiles").update({ circuit: circuit.trim() || null }).eq("id", user.id);
    setBusyCircuit(false);
    if (error) { toast.error(t("profile.saveError"), { description: error.message }); return; }
    toast.success(t("profile.circuitUpdated"));
    refresh();
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setBusyEmail(false);
    if (error) { toast.error(t("profile.emailUpdateFail"), { description: error.message }); return; }
    toast.success(t("profile.emailConfirm"));
  };

  const savePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error(t("profile.passwordMin")); return; }
    if (pwd !== pwd2) { toast.error(t("profile.passwordMismatch")); return; }
    setBusyPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusyPwd(false);
    if (error) { toast.error(t("profile.passwordUpdateFail"), { description: error.message }); return; }
    toast.success(t("profile.passwordUpdated"));
    setPwd(""); setPwd2("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">{t("profile.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("profile.subtitle")}</p>
      </header>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> {t("profile.language")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <LanguageSwitcher />
          <p className="text-xs text-muted-foreground">{t("profile.languageHelp")}</p>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserIcon className="h-4 w-4 text-primary" /> {t("profile.personalData")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("profile.fullName")}</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} placeholder={t("profile.fullNamePlaceholder")} />
              <p className="text-xs text-muted-foreground">{t("profile.fullNameHelp")}</p>
            </div>
            <Button type="submit" disabled={busyName}>{t("profile.saveName")}</Button>
          </form>
        </CardContent>
      </Card>


      {role === "superintendent" && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("profile.circuit")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveCircuit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="circuit">{t("profile.circuitId")}</Label>
                <Input id="circuit" value={circuit} onChange={(e) => setCircuit(e.target.value)} placeholder={t("profile.circuitPlaceholder")} maxLength={60} />
                <p className="text-xs text-muted-foreground">{t("profile.circuitHelp")}</p>
              </div>
              <Button type="submit" disabled={busyCircuit}>{t("profile.saveCircuit")}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {t("profile.email")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveEmail} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("profile.emailLabel")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("profile.emailPlaceholder")} />
              <p className="text-xs text-muted-foreground">{t("profile.emailHelp")}</p>
            </div>
            <Button type="submit" disabled={busyEmail || !email.trim()}>{t("profile.updateEmail")}</Button>
          </form>
        </CardContent>
      </Card>


      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> {t("profile.changePassword")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={savePwd} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pwd">{t("profile.newPassword")}</Label>
              <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd2">{t("profile.confirmPassword")}</Label>
              <Input id="pwd2" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={busyPwd}>{t("profile.updatePassword")}</Button>
          </form>
        </CardContent>
      </Card>

      {role === "superintendent" && (
        <Card className="shadow-card border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> {t("profile.backupSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {autoBackup
                ? t("profile.autoBackupLast", { date: new Date(autoBackup.updatedAt).toLocaleString() })
                : t("profile.autoBackupNone")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={doExportBackup} disabled={busyBackup !== null}>
                {busyBackup === "export" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                {t("profile.generateBackup")}
              </Button>
              <Button variant="outline" onClick={() => restoreInputRef.current?.click()} disabled={busyBackup !== null}>
                <Upload className="h-4 w-4 mr-1" />{t("profile.restoreBackup")}
              </Button>
              <input
                ref={restoreInputRef} type="file" accept="application/json,.json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickRestoreFile(f); }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("profile.backupIncludes")}</p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" /> {t("support.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SupportDeveloperContent />
        </CardContent>
      </Card>



      <AlertDialog open={pendingRestore !== null} onOpenChange={(o) => { if (!o) setPendingRestore(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("profile.confirmRestoreTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("profile.confirmRestoreDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={busyBackup === "restore"}>
              {busyBackup === "restore" ? t("profile.restoring") : t("profile.yesRestore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
