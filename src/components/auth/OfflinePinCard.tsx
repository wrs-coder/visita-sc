// Gerenciamento do acesso sem internet (PIN + biometria) — usado em "Meu perfil".
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Fingerprint, KeyRound, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PinSetupDialog } from "@/components/auth/PinSetupDialog";
import {
  clearVault,
  getUnlockedContentKey,
  getVaultMeta,
  isPinValid,
  setVaultBiometricFlag,
  unlockVault,
  type VaultMeta,
} from "@/lib/offline-credentials";
import {
  checkBiometricSupport,
  disableBiometric,
  enableBiometric,
  isBiometricEnabled,
} from "@/lib/biometric-unlock";

export function OfflinePinCard() {
  const { t, i18n } = useTranslation();
  const [meta, setMeta] = useState<VaultMeta | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioOnly, setBioOnly] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [pinAskOpen, setPinAskOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    void getVaultMeta().then(setMeta);
    void isBiometricEnabled().then(setBioOn);
  }, []);

  useEffect(() => {
    reload();
    void checkBiometricSupport().then((s) => {
      setBioSupported(s.available);
      setBioOnly(s.deviceCredentialOnly);
    });
  }, [reload]);

  const validUntil = meta
    ? new Date(meta.expiresAt).toLocaleDateString(i18n.language || "pt-BR")
    : "";

  const turnOn = async (contentKey: Uint8Array) => {
    await enableBiometric(contentKey, t("offlinePin.biometricReason"));
    await setVaultBiometricFlag(true);
    setBioOn(true);
    toast.success(t("offlinePin.biometricEnabled"));
  };

  const handleToggle = async (next: boolean) => {
    if (!meta) return;
    if (!next) {
      await disableBiometric();
      await setVaultBiometricFlag(false);
      setBioOn(false);
      toast.success(t("offlinePin.biometricDisabled"));
      return;
    }
    const key = getUnlockedContentKey(meta.userId);
    if (key) {
      try {
        await turnOn(key);
      } catch {
        toast.error(t("offlinePin.biometricNotEnabled"));
      }
      return;
    }
    setPin("");
    setPinAskOpen(true);
  };

  const confirmWithPin = async () => {
    if (!isPinValid(pin)) {
      toast.error(t("offlinePin.invalidFormat"));
      return;
    }
    setBusy(true);
    try {
      await unlockVault(pin);
      const key = getUnlockedContentKey(meta?.userId);
      if (!key) throw new Error("no-key");
      await turnOn(key);
      setPinAskOpen(false);
      setPin("");
    } catch {
      toast.error(t("offlinePin.wrongPin"));
    } finally {
      setBusy(false);
      reload();
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-primary" /> {t("offlinePin.manageTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {meta
            ? t("offlinePin.manageDescOn", { date: validUntil })
            : t("offlinePin.manageDescOff")}
        </p>

        {meta && bioSupported ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Fingerprint className="h-4 w-4 text-primary" />
                {bioOnly ? t("offlinePin.useDeviceLock") : t("offlinePin.useBiometric")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("offlinePin.biometricHint")}</p>
            </div>
            <Switch checked={bioOn} onCheckedChange={(v) => void handleToggle(v)} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSetupOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            {meta ? t("offlinePin.change") : t("offlinePin.create")}
          </Button>
          {meta ? (
            <Button variant="outline" onClick={() => setRemoveOpen(true)}>
              {t("offlinePin.remove")}
            </Button>
          ) : null}
        </div>
      </CardContent>

      <PinSetupDialog open={setupOpen} onOpenChange={setSetupOpen} onCreated={reload} />

      <Dialog open={pinAskOpen} onOpenChange={setPinAskOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("offlinePin.confirmPinTitle")}</DialogTitle>
            <DialogDescription>{t("offlinePin.confirmPinDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bio-pin">{t("offlinePin.pinLabel")}</Label>
              <Input
                id="bio-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button className="w-full" disabled={busy} onClick={() => void confirmWithPin()}>
              <Fingerprint className="mr-2 h-4 w-4" />
              {t("offlinePin.biometricEnable")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("offlinePin.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("offlinePin.removeDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await clearVault();
                reload();
                toast.success(t("offlinePin.removed"));
              }}
            >
              {t("offlinePin.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
