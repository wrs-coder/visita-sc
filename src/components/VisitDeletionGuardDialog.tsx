// Wrapper de proteção para exclusão de visita.
//
// Antes de abrir o `FinishVisitDialog` destrutivo, consulta o servidor
// para saber se os anciãos da congregação já começaram a preencher a
// visita. Se já preencheram, mostra um diálogo amigável com a lista do
// que foi preenchido e dois caminhos: "Manter visita agendada" (padrão,
// destacado) ou "Excluir mesmo assim" (que então abre o fluxo S-303).
//
// Se nada foi preenchido, abre direto o `FinishVisitDialog` original.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FinishVisitDialog } from "@/components/FinishVisitDialog";
import {
  getVisitFillSummary,
  type VisitFillItem,
} from "@/lib/visit-deletion.functions";

interface Props {
  visitId: string;
  visitTitle: string;
  onFinished?: () => void;
  /**
   * Quando true, esconde o botão padrão. Útil para casos em que outro
   * componente já oferece o gatilho e controla `open` externamente.
   */
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Phase = "idle" | "checking" | "warn" | "destructive";

export function VisitDeletionGuardDialog({
  visitId,
  visitTitle,
  onFinished,
  hideTrigger,
  open: openProp,
  onOpenChange,
}: Props) {
  const fn = useServerFn(getVisitFillSummary);
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<VisitFillItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Quando `open` é controlado externamente e vira true, dispara a verificação.
  useEffect(() => {
    if (openProp && phase === "idle") void start();
    if (openProp === false && phase !== "idle") setPhase("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProp]);

  const start = async () => {
    setPhase("checking");
    try {
      const res = await fn({ data: { visitId } });
      if (!res.ok) {
        toast.error(res.error);
        setPhase("idle");
        onOpenChange?.(false);
        return;
      }
      if (!res.hasContent) {
        // Sem fricção: abre direto o fluxo S-303.
        setItems([]);
        setTotalCount(0);
        setPhase("destructive");
        return;
      }
      setItems(res.items);
      setTotalCount(res.totalCount);
      setPhase("warn");
    } catch (e) {
      toast.error("Falha ao verificar preenchimento", { description: (e as Error).message });
      setPhase("idle");
      onOpenChange?.(false);
    }
  };

  const handleTrigger = () => {
    onOpenChange?.(true);
    if (openProp === undefined) void start();
  };

  const closeAll = () => {
    setPhase("idle");
    onOpenChange?.(false);
  };

  const proceedToDestructive = () => {
    setPhase("destructive");
  };

  return (
    <>
      {!hideTrigger && (
        <Button variant="destructive" size="sm" onClick={handleTrigger}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Finalizar visita
        </Button>
      )}

      {/* Loader visual enquanto consulta o servidor (não bloqueante além do toast). */}
      <AlertDialog open={phase === "checking"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Verificando…
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estamos verificando se os anciãos já preencheram informações desta visita.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aviso amigável quando já existe preenchimento dos anciãos. */}
      <AlertDialog open={phase === "warn"} onOpenChange={(o) => !o && closeAll()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Os anciãos já começaram a preencher esta visita
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  A visita <strong>{visitTitle}</strong> já tem{" "}
                  <strong>{totalCount}</strong> {totalCount === 1 ? "registro preenchido" : "registros preenchidos"}{" "}
                  pelos anciãos da congregação. Se excluir agora, essas informações serão perdidas.
                </p>
                <ul className="list-disc pl-5 text-sm space-y-0.5">
                  {items.map((it) => (
                    <li key={it.key}>
                      <strong>{it.count}</strong> · {it.label}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-1">
                  Sugestão: mantenha a visita agendada e converse com o corpo de anciãos
                  antes de excluir.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogAction onClick={closeAll}>
              Manter visita agendada
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={(e) => {
                e.preventDefault();
                proceedToDestructive();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive"
            >
              Excluir mesmo assim
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo destrutivo padrão (S-303 + designações). */}
      <FinishVisitDialog
        visitId={visitId}
        visitTitle={visitTitle}
        hideTrigger
        open={phase === "destructive"}
        onOpenChange={(o) => {
          if (!o) closeAll();
        }}
        onFinished={() => {
          setPhase("idle");
          onOpenChange?.(false);
          onFinished?.();
        }}
      />
    </>
  );
}
