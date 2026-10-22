import { useTranslation } from "react-i18next";
import { Mail, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DEV_EMAIL = "wrscircuito@gmail.com";

/** Link discreto que explica como pedir o código de cadastro do superintendente. */
export function HowToGetCode() {
  const { t } = useTranslation();
  const href = `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(t("login.emailSubject"))}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary">
          <HelpCircle className="h-3.5 w-3.5" /> {t("login.howGetCode")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("login.howGetCodeTitle")}</DialogTitle>
          <DialogDescription>{t("login.howGetCodeBody")}</DialogDescription>
        </DialogHeader>
        <Button asChild className="w-full h-11">
          <a href={href}><Mail className="mr-2 h-4 w-4" /> {t("login.requestByEmail")}</a>
        </Button>
        <p className="text-center text-xs text-muted-foreground">{DEV_EMAIL}</p>
      </DialogContent>
    </Dialog>
  );
}
