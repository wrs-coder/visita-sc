import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TermsContent } from "./terms-content";

export function TermsDialog({ trigger }: { trigger: (open: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Termos de Uso</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-1">
            <TermsContent />
          </div>
          <DialogClose asChild><Button className="w-full">Fechar</Button></DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
