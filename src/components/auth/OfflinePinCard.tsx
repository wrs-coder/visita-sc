// Gerenciamento do acesso sem internet (PIN) — usado em "Meu perfil".
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PinSetupDialog } from "@/components/auth/PinSetupDialog";
import { clearVault, getVaultMeta, type VaultMeta } from "@/lib/offline-credentials";

export function OfflinePinCard() {
  const { t, i18n } = useTranslation();
  const [meta, setMeta] = useState<VaultMeta | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const reload = useCallback(() => {
    void getVaultMeta().then(setMeta);
  }, []);

  useEffect(() => reload(), [reload]);

  const validUntil = meta
    ? new Date(meta.expiresAt).toLocaleDateString(i18n.language || "pt-BR")
    : "";

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
