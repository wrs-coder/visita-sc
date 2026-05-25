import { Coffee, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const PIX_EMAIL = "wrscircuito@gmail.com";
const WISE_USER = "wandersonp264";
const WISE_URL = "https://wise.com/pay/me/wandersonp264";
const WHATSAPP_URL = "https://wa.me/5571983420366";

/** Conteúdo reutilizável da seção "Apoie o Desenvolvedor". */
export function SupportDeveloperContent() {
  const { t } = useTranslation();

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_EMAIL);
      toast.success(t("support.pixCopied"));
    } catch {
      toast.error(t("support.pixCopyFail") + PIX_EMAIL);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{t("support.body")}</p>

      <div className="space-y-3">
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{t("support.pixLabel")}</span> {PIX_EMAIL}
          </p>
          <Button onClick={copyPix} className="w-full" size="sm">
            <Copy className="h-4 w-4 mr-2" /> {t("support.copyPix")}
          </Button>
        </div>

        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{t("support.wiseLabel")}</span>{" "}
            {WISE_USER}
          </p>
          <Button asChild variant="outline" className="w-full" size="sm">
            <a href={WISE_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> {t("support.openWise")}
            </a>
          </Button>
        </div>

        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">{t("support.otherWayHint")}</p>
          <Button asChild variant="outline" className="w-full" size="sm">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" /> {t("support.whatsapp")}
            </a>
          </Button>
        </div>
      </div>

      <p className="text-[11px] italic text-muted-foreground text-center">{t("support.note")}</p>
    </div>
  );
}

/** Diálogo "Apoie o Desenvolvedor" — trigger opcional + controle externo opcional. */
export function SupportDeveloperDialog({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-primary" />
            {t("support.title")}
          </DialogTitle>
        </DialogHeader>
        <SupportDeveloperContent />
        <DialogClose asChild>
          <Button variant="outline" className="w-full">
            {t("support.close")}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
