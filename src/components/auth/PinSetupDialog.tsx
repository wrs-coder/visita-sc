// Criação / alteração do PIN de acesso offline.
// Só funciona com sessão ativa (login online feito) — a senha NÃO é guardada.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Fingerprint, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createVault,
  getUnlockedContentKey,
  isPinValid,
  maskLabel,
  setVaultBiometricFlag,
} from "@/lib/offline-credentials";
import { checkBiometricSupport, enableBiometric } from "@/lib/biometric-unlock";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
};

function readProfileSnapshot(userId: string): unknown {
  try {
    const raw = localStorage.getItem(`visita-sc:auth-profile:${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function PinSetupDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPinValid(pin)) {
      toast.error(t("offlinePin.invalidFormat"));
      return;
    }
    if (pin !== confirm) {
      toast.error(t("offlinePin.mismatch"));
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!s?.access_token || !s.refresh_token || !s.user) {
        toast.error(t("offlinePin.needsOnline"));
        return;
      }
      const label = maskLabel(s.user.email ?? s.user.phone ?? "");
      await createVault(
        pin,
        {
          userId: s.user.id,
          email: s.user.email ?? null,
          session: {
            access_token: s.access_token,
            refresh_token: s.refresh_token,
            expires_at: s.expires_at ?? null,
          },
          profile: readProfileSnapshot(s.user.id),
        },
        label,
      );
      toast.success(t("offlinePin.created"));
      setPin("");
      setConfirm("");
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      console.warn("[offline-pin] falha ao criar cofre", err);
      toast.error(t("offlinePin.unsupported"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {t("offlinePin.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("offlinePin.createDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pin">{t("offlinePin.newPin")}</Label>
            <Input
              id="new-pin"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              type="password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pin">{t("offlinePin.confirmPin")}</Label>
            <Input
              id="confirm-pin"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
              type="password"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("offlinePin.later")}
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {t("offlinePin.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
