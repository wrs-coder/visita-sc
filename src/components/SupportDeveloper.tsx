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

const PIX_EMAIL = "wrscircuito@gmail.com";
const WISE_USER = "wandersonp264";
const WISE_URL = "https://wise.com/pay/me/wandersonp264";
const WHATSAPP_URL = "https://wa.me/5571983420366";

async function copyPix() {
  try {
    await navigator.clipboard.writeText(PIX_EMAIL);
    toast.success("Chave PIX copiada com sucesso!");
  } catch {
    toast.error("Não foi possível copiar. Copie manualmente: " + PIX_EMAIL);
  }
}

/** Conteúdo reutilizável da seção "Apoie o Desenvolvedor". */
export function SupportDeveloperContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        O Visita SC é feito de irmão para irmão, 100% gratuito e sem anúncios, com o objetivo de
        simplificar a rotina da visita do superintendente. Se este projeto tem sido útil no circuito
        e você deseja expressar sua gratidão, sinta-se à vontade para enviar um apoio voluntário em
        forma de presente. É um gesto espontâneo de carinho que valoriza a dedicação investida
        neste app.
      </p>

      <div className="space-y-3">
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Nacional (PIX):</span> {PIX_EMAIL}
          </p>
          <Button onClick={copyPix} className="w-full" size="sm">
            <Copy className="h-4 w-4 mr-2" /> Copiar chave PIX
          </Button>
        </div>

        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Internacional (Wise):</span>{" "}
            {WISE_USER}
          </p>
          <Button asChild variant="outline" className="w-full" size="sm">
            <a href={WISE_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Abrir Wise
            </a>
          </Button>
        </div>

        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Se desejar ajudar de outra forma, entre em contato direto comigo pelo WhatsApp.
          </p>
          <Button asChild variant="outline" className="w-full" size="sm">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp
            </a>
          </Button>
        </div>
      </div>

      <p className="text-[11px] italic text-muted-foreground text-center">
        Nota: O acesso continua 100% liberado e gratuito para todos, sem limitações.
      </p>
    </div>
  );
}

/** Diálogo "Apoie o Desenvolvedor" — recebe um trigger customizado. */
export function SupportDeveloperDialog({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-primary" />
            Apoie o Desenvolvedor ☕
          </DialogTitle>
        </DialogHeader>
        <SupportDeveloperContent />
        <DialogClose asChild>
          <Button variant="outline" className="w-full">
            Fechar
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
