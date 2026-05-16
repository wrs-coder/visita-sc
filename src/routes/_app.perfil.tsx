import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useAutoBackup } from "@/hooks/use-auto-backup";
import { supabase } from "@/integrations/supabase/client";
import { exportFullBackup, restoreFullBackup } from "@/lib/backup.functions";
import { shareJsonFile, readJsonFile } from "@/lib/share";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { User as UserIcon, Mail, KeyRound, ShieldCheck, Download, Upload, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/perfil")({ component: Page });

function Page() {
  const { user, profile, refresh, role } = useAuth();
  const autoBackup = useAutoBackup();
  const fnExportBackup = useServerFn(exportFullBackup);
  const fnRestoreBackup = useServerFn(restoreFullBackup);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<unknown | null>(null);
  const [busyBackup, setBusyBackup] = useState<null | "export" | "restore">(null);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? profile?.email ?? "");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busyName, setBusyName] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPwd, setBusyPwd] = useState(false);

  const doExportBackup = async () => {
    setBusyBackup("export");
    const r = await fnExportBackup();
    setBusyBackup(null);
    if (!r.ok || !r.file) { toast.error(r.error ?? "Falha"); return; }
    const fname = `visita-sc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const res = await shareJsonFile(fname, r.file);
    toast.success(res === "shared" ? "Compartilhamento aberto" : "Backup baixado");
  };

  const pickRestoreFile = async (file: File) => {
    try {
      const json = await readJsonFile(file);
      setPendingRestore(json);
    } catch (e) {
      toast.error("Arquivo inválido", { description: (e as Error).message });
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
    if (!r.ok) { toast.error("Falha ao restaurar", { description: r.error }); return; }
    toast.success(`Backup restaurado (${r.restored} registros).`);
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusyName(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    setBusyName(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success("Nome atualizado");
    refresh();
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setBusyEmail(false);
    if (error) { toast.error("Não foi possível atualizar o e-mail", { description: error.message }); return; }
    toast.success("Confirme o novo e-mail na sua caixa de entrada para concluir a alteração.");
  };

  const savePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    if (pwd !== pwd2) { toast.error("As senhas não coincidem"); return; }
    setBusyPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusyPwd(false);
    if (error) { toast.error("Não foi possível atualizar a senha", { description: error.message }); return; }
    toast.success("Senha atualizada");
    setPwd(""); setPwd2("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Atualize seus dados pessoais, e-mail e senha</p>
      </header>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserIcon className="h-4 w-4 text-primary" /> Dados pessoais</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={120} />
            </div>
            <Button type="submit" disabled={busyName}>Salvar nome</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> E-mail de acesso</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveEmail} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Novo e-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Você receberá um link de confirmação no novo endereço.</p>
            </div>
            <Button type="submit" disabled={busyEmail}>Atualizar e-mail</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Alterar senha</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={savePwd} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Nova senha</Label>
              <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd2">Confirmar nova senha</Label>
              <Input id="pwd2" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={busyPwd}>Atualizar senha</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
