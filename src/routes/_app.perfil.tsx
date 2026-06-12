import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useAutoBackup } from "@/hooks/use-auto-backup";
import { supabase } from "@/integrations/supabase/client";
import { exportFullBackup, restoreFullBackup } from "@/lib/backup.functions";
import { dumpClientBackup, restoreClientBackup } from "@/lib/backup-client";
import { packBackupZip, unpackBackupZip, looksLikeZip } from "@/lib/backup-package";
import { saveBlob, readJsonFile, pickFile } from "@/lib/share";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { User as UserIcon, Mail, KeyRound, ShieldCheck, Download, Upload, Loader2, Coffee, Globe, Languages } from "lucide-react";
import { SupportDeveloperContent } from "@/components/SupportDeveloper";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { BibleManagerDialog } from "@/components/bible/BibleManagerDialog";
import { getActiveLibrary, type BibleLibrary } from "@/lib/bible-notes-store";

import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/perfil")({ component: Page });

function Page() {
  const { user, profile, refresh, role } = useAuth();
  const { t } = useTranslation();
  const autoBackup = useAutoBackup();
  const fnExportBackup = useServerFn(exportFullBackup);
  const fnRestoreBackup = useServerFn(restoreFullBackup);
  
  const [pendingRestore, setPendingRestore] = useState<
    | { kind: "v1"; payload: unknown }
    | { kind: "v2"; full: Awaited<ReturnType<typeof unpackBackupZip>> }
    | null
  >(null);
  const [busyBackup, setBusyBackup] = useState<null | "export" | "restore">(null);
  const [backupPhase, setBackupPhase] = useState<string>("");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [circuit, setCircuit] = useState(profile?.circuit ?? "");
  const [email, setEmail] = useState(user?.email ?? profile?.email ?? "");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busyName, setBusyName] = useState(false);
  const [busyCircuit, setBusyCircuit] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPwd, setBusyPwd] = useState(false);
  const [bibleOpen, setBibleOpen] = useState(false);
  const [activeBible, setActiveBible] = useState<BibleLibrary | null>(null);
  const [wifeCode, setWifeCode] = useState("");
  const [busyWife, setBusyWife] = useState(false);

  const refreshActiveBible = async () => setActiveBible(await getActiveLibrary());
  useEffect(() => { refreshActiveBible(); }, []);

  useEffect(() => {
    if (!user || role !== "superintendent") return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("wife_invite_code").eq("id", user.id).maybeSingle();
      if (!cancelled) setWifeCode(((data as { wife_invite_code: string | null } | null)?.wife_invite_code) ?? "");
    })();
    return () => { cancelled = true; };
  }, [user, role]);

  const generateWifeCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setWifeCode(s);
  };

  const saveWifeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const value = wifeCode.trim().toUpperCase();
    if (value && !/^[A-Z0-9]{4,12}$/.test(value)) {
      toast.error(t("profile.wifeAccess.errorFormat"));
      return;
    }
    setBusyWife(true);
    const { error } = await supabase
      .from("profiles")
      .update({ wife_invite_code: value || null })
      .eq("id", user.id);
    setBusyWife(false);
    if (error) {
      if (error.code === "23505") toast.error(t("profile.wifeAccess.errorTaken"));
      else toast.error(t("profile.saveError"), { description: error.message });
      return;
    }
    toast.success(value ? t("profile.wifeAccess.saved") : t("profile.wifeAccess.removed"));
  };

  const copyWifeCode = async () => {
    if (!wifeCode) return;
    try {
      await navigator.clipboard.writeText(wifeCode.trim().toUpperCase());
      toast.success(t("profile.wifeAccess.copied"));
    } catch { /* ignore */ }
  };


  const doExportBackup = async () => {
    setBusyBackup("export");
    setBackupPhase(t("profile.backup.phaseServer"));
    try {
      const r = await fnExportBackup();
      if (!r.ok || !r.file) { toast.error(r.error ?? t("profile.failGeneric")); return; }

      setBackupPhase(t("profile.backup.phaseClient"));
      const client = await dumpClientBackup();

      setBackupPhase(t("profile.backup.phasePackage"));
      const blob = await packBackupZip({
        manifest: {
          type: "visita_sc_backup_zip",
          version: 3,
          exportedAt: new Date().toISOString(),
          app: "visita-sc",
        },
        server: r.file,
        client,
      });
      const fname = `visita-sc-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      const res = await saveBlob(blob, {
        filename: fname,
        mimeType: "application/zip",
        pickerTypes: [{ description: "Backup .zip", accept: { "application/zip": [".zip"] } }],
      });
      toast.success(res === "shared" ? t("profile.shareOpened") : t("profile.backupDownloaded"));
    } catch (e) {
      toast.error(t("profile.failGeneric"), { description: (e as Error).message });
    } finally {
      setBackupPhase("");
      setBusyBackup(null);
    }
  };

  const pickRestoreFile = async (file: File) => {
    try {
      if (looksLikeZip(file)) {
        const full = await unpackBackupZip(file);
        setPendingRestore({ kind: "v2", full });
      } else {
        const json = await readJsonFile(file);
        setPendingRestore({ kind: "v1", payload: json });
      }
    } catch (e) {
      toast.error(t("profile.invalidFile"), { description: (e as Error).message });
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    setBusyBackup("restore");
    try {
      if (pendingRestore.kind === "v2") {
        setBackupPhase(t("profile.backup.phaseServer"));
        const r = await fnRestoreBackup({ data: { file: pendingRestore.full.server as never } });
        if (!r.ok) { toast.error(t("profile.restoreFail"), { description: r.error }); return; }
        setBackupPhase(t("profile.backup.phaseClient"));
        const c = await restoreClientBackup(pendingRestore.full.client);
        toast.success(t("profile.backup.restoredFull", {
          server: r.restored, notes: c.notes, libraries: c.libraries,
        }));
      } else {
        const r = await fnRestoreBackup({ data: { file: pendingRestore.payload as never } });
        if (!r.ok) { toast.error(t("profile.restoreFail"), { description: r.error }); return; }
        toast.success(t("profile.restoredCount", { count: r.restored }));
      }
    } catch (e) {
      toast.error(t("profile.restoreFail"), { description: (e as Error).message });
    } finally {
      setPendingRestore(null);
      setBackupPhase("");
      setBusyBackup(null);
    }
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

      {role === "superintendent" && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> {t("profile.wifeAccess.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveWifeCode} className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("profile.wifeAccess.description")}</p>
              <div className="space-y-1.5">
                <Label htmlFor="wifeCode">{t("profile.wifeAccess.codeLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="wifeCode"
                    value={wifeCode}
                    onChange={(e) => setWifeCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
                    placeholder={t("profile.wifeAccess.placeholder")}
                    maxLength={12}
                    className="flex-1 min-w-[160px] font-mono tracking-widest"
                  />
                  <Button type="button" variant="outline" onClick={generateWifeCode}>{t("profile.wifeAccess.generate")}</Button>
                  <Button type="button" variant="outline" onClick={copyWifeCode} disabled={!wifeCode}>{t("profile.wifeAccess.copy")}</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busyWife}>{t("profile.wifeAccess.save")}</Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busyWife || !wifeCode}
                  onClick={() => { setWifeCode(""); }}
                >
                  {t("profile.wifeAccess.remove")}
                </Button>
              </div>
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
        <>
          <Card className="shadow-card border-primary/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="h-4 w-4 text-primary" /> {t("bibleManager.manage")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("bibleManager.activeLabel")}:</span>
                <Badge variant={activeBible ? "secondary" : "outline"}>
                  {activeBible
                    ? `${activeBible.title} (${activeBible.langLabel}) · ${activeBible.verseCount}`
                    : t("bibleManager.noneActive", { defaultValue: "Nenhuma" })}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setBibleOpen(true)}>
                <Languages className="h-4 w-4 mr-1.5" />
                {t("bibleManager.manage")}
              </Button>
            </CardContent>
          </Card>

          <BibleManagerDialog open={bibleOpen} onOpenChange={setBibleOpen} onChanged={refreshActiveBible} />
        </>
      )}

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
              <Button
                variant="outline"
                onClick={async () => {
                  const f = await pickFile("application/zip,application/json,.zip,.json");
                  if (f) pickRestoreFile(f);
                }}
                disabled={busyBackup !== null}
              >
                <Upload className="h-4 w-4 mr-1" />{t("profile.restoreBackup")}
              </Button>
            </div>
            {backupPhase && (
              <p className="text-xs text-primary">{backupPhase}</p>
            )}
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
