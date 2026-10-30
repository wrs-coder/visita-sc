// Pede novo aceite quando a versão dos Termos muda (contas e acesso por código).
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { TermsDialog } from "./TermsDialog";
import { TERMS_VERSION_LABEL, hasAcceptedCurrentTerms, recordTermsAcceptance } from "@/lib/terms-acceptance";

const hasGuestSession = () => { try { return !!localStorage.getItem("guest_invite_code"); } catch { return false; } };

export function TermsUpdateDialog() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Telas públicas (login, cadastro, termos) não pedem; o cadastro já tem a caixa.
    const publicPage = path === "/" || path.startsWith("/cadastro") || path === "/visitante" || path === "/visitante/"
      || path.startsWith("/termos") || path.startsWith("/politica") || path.startsWith("/confirmar");
    const signedIn = !!user || (path.startsWith("/visitante") && hasGuestSession());
    setOpen(!publicPage && signedIn && !hasAcceptedCurrentTerms());
  }, [user, path]);

  const accept = () => { recordTermsAcceptance(); setOpen(false); };

  return (
    <Dialog open={open} onOpenChange={() => { /* só fecha aceitando */ }}>
      <DialogContent className="max-w-sm z-[200]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Termos de Uso atualizados</DialogTitle>
          <DialogDescription>Versão de {TERMS_VERSION_LABEL}. Para continuar usando o Visita SC, leia e aceite os novos termos.</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Quem desenvolve o app e como entrar em contato</li>
          <li>O app é uma ferramenta independente e não oficial</li>
          <li>Bíblia e JW Library só a partir de arquivos que você importa</li>
        </ul>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <TermsDialog trigger={(o) => <Button variant="outline" className="w-full" onClick={o}>Ler termos</Button>} />
          <Button className="w-full" onClick={accept}>Aceitar e continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
