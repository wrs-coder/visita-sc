// Entrada sem internet: abre o cofre local com o PIN e restaura a sessão
// guardada no aparelho, sem consultar o banco de dados.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getVaultMeta,
  isPinValid,
  unlockVault,
  VaultError,
  type VaultMeta,
} from "@/lib/offline-credentials";
import { setMode } from "@/lib/connection-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  meta: VaultMeta;
  /** Chamado quando o usuário prefere entrar com usuário e senha. */
  onUsePassword: () => void;
  onUnlocked: () => void;
  onVaultGone: () => void;
};

export function PinUnlockPanel({ meta, onUsePassword, onUnlocked, onVaultGone }: Props) {
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<VaultMeta>(meta);

  useEffect(() => setCurrent(meta), [meta]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPinValid(pin)) {
      toast.error(t("offlinePin.invalidFormat"));
      return;
    }
    setBusy(true);
    try {
      const payload = await unlockVault(pin);

      // Restaura o retrato de perfil ANTES da sessão, para o app hidratar
      // imediatamente mesmo sem rede.
      if (payload.profile) {
        try {
          localStorage.setItem(
            `visita-sc:auth-profile:${payload.userId}`,
            JSON.stringify(payload.profile),
          );
        } catch {
          /* quota */
        }
      }

      let online = true;
      try {
        const { error } = await supabase.auth.setSession({
          access_token: payload.session.access_token,
          refresh_token: payload.session.refresh_token,
        });
        if (error) online = false;
      } catch {
        online = false;
      }
      // Sem rede (ou token expirado sem conseguir renovar): segue em Modo
      // Offline, lendo tudo do cache local já baixado.
      if (!online) setMode("offline");

      toast.success(t("offlinePin.unlocked"));
      setPin("");
      onUnlocked();
    } catch (err) {
      const ve = err instanceof VaultError ? err : null;
      if (!ve) {
        toast.error(t("offlinePin.unsupported"));
      } else if (ve.code === "expired") {
        toast.error(t("offlinePin.expired"));
        onVaultGone();
      } else if (ve.code === "destroyed") {
        toast.error(t("offlinePin.destroyed"));
        onVaultGone();
      } else if (ve.code === "no-vault") {
        onVaultGone();
      } else if (ve.code === "locked") {
        toast.error(t("offlinePin.locked", { seconds: Math.ceil((ve.retryInMs ?? 0) / 1000) }));
      } else if (ve.code === "unsupported") {
        toast.error(t("offlinePin.unsupported"));
      } else {
        toast.error(
          ve.attemptsLeft !== undefined
            ? `${t("offlinePin.wrongPin")} ${t("offlinePin.attemptsLeft", { n: ve.attemptsLeft })}`
            : t("offlinePin.wrongPin"),
        );
        if (ve.retryInMs) {
          toast.warning(t("offlinePin.locked", { seconds: Math.ceil(ve.retryInMs / 1000) }));
        }
      }
      const fresh = await getVaultMeta();
      if (!fresh) onVaultGone();
      else setCurrent(fresh);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <WifiOff className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-lg leading-tight">{t("offlinePin.title")}</h2>
          {current.label ? (
            <p className="text-xs text-muted-foreground">
              {t("offlinePin.subtitleWithLabel", { label: current.label })}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="unlock-pin">{t("offlinePin.pinLabel")}</Label>
        <Input
          id="unlock-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
      <Button type="submit" className="w-full h-11" disabled={busy}>
        <KeyRound className="mr-2 h-4 w-4" />
        {busy ? t("offlinePin.unlocking") : t("offlinePin.unlock")}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onUsePassword}>
        {t("offlinePin.useAccount")}
      </Button>
    </form>
  );
}
