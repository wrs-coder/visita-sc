// Badge no dashboard que avisa quando o superintendente atualizou um modelo
// que afeta visitas futuras desta congregação. Clicar abre um diálogo com
// a lista; cada item pode ser dispensado individualmente ou em massa.
//
// Não altera dados da visita — é só um aviso. Para aplicar a atualização,
// o usuário usa o botão "Aplicar modelo" que já existe em cada aba.

import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellRing, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  countPendingUpdatesForCongregation,
  listPendingUpdatesForCongregation,
  dismissPendingUpdate,
  dismissAllPendingUpdatesForVisit,
  type PendingUpdateRow,
} from "@/lib/template-propagation.functions";

interface Props {
  congregationId: string | null | undefined;
}

export function TemplateUpdatesBadge({ congregationId }: Props) {
  const countFn = useServerFn(countPendingUpdatesForCongregation);
  const listFn = useServerFn(listPendingUpdatesForCongregation);
  const dismissFn = useServerFn(dismissPendingUpdate);
  const dismissAllFn = useServerFn(dismissAllPendingUpdatesForVisit);

  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingUpdateRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    if (!congregationId) {
      setCount(0);
      return;
    }
    try {
      const r = await countFn({ data: { congregationId } });
      if (r.ok) setCount(r.count);
    } catch {
      // silencioso — feature secundária
    }
  }, [congregationId, countFn]);

  useEffect(() => {
    void refreshCount();
    const id = setInterval(refreshCount, 60_000); // refresh suave a cada 1min
    return () => clearInterval(id);
  }, [refreshCount]);

  const handleOpen = async () => {
    if (!congregationId) return;
    setOpen(true);
    setLoading(true);
    try {
      const r = await listFn({ data: { congregationId } });
      if (r.ok) setItems(r.items);
      else toast.error("Falha ao carregar atualizações", { description: r.error });
    } catch (err) {
      toast.error("Falha ao carregar atualizações", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const r = await dismissFn({ data: { id } });
      if (r.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        void refreshCount();
      } else {
        toast.error("Falha ao dispensar", { description: r.error });
      }
    } catch (err) {
      toast.error("Falha ao dispensar", { description: (err as Error).message });
    }
  };

  const handleDismissAllForVisit = async (visitId: string) => {
    try {
      const r = await dismissAllFn({ data: { visitId } });
      if (r.ok) {
        setItems((prev) => prev.filter((i) => i.visit_id !== visitId));
        void refreshCount();
      } else {
        toast.error("Falha ao dispensar", { description: r.error });
      }
    } catch (err) {
      toast.error("Falha ao dispensar", { description: (err as Error).message });
    }
  };

  if (!congregationId || count === 0) return null;

  // Agrupa por visita para exibição mais limpa.
  const groups = new Map<string, { title: string; date: string; rows: PendingUpdateRow[] }>();
  for (const it of items) {
    if (!groups.has(it.visit_id)) {
      groups.set(it.visit_id, {
        title: it.visit_title ?? "Visita",
        date: it.visit_start_date,
        rows: [],
      });
    }
    groups.get(it.visit_id)!.rows.push(it);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="relative h-8 gap-2"
      >
        <BellRing className="h-4 w-4 text-amber-500" />
        <span>Modelos atualizados</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {count}
        </Badge>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Modelos atualizados
            </DialogTitle>
            <DialogDescription>
              O superintendente atualizou modelos que afetam visitas futuras.
              Para aplicar as mudanças em uma visita, use o botão{" "}
              <strong>“Aplicar modelo”</strong> na aba correspondente daquela visita.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Sem atualizações pendentes.
            </p>
          ) : (
            <div className="space-y-4">
              {Array.from(groups.entries()).map(([visitId, g]) => (
                <div key={visitId} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{g.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.date
                          ? format(new Date(g.date + "T00:00:00"), "dd 'de' MMMM yyyy", {
                              locale: ptBR,
                            })
                          : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleDismissAllForVisit(visitId)}
                    >
                      Dispensar todas
                    </Button>
                  </div>
                  <ul className="space-y-1">
                    {g.rows.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-start justify-between gap-2 text-sm bg-muted/40 rounded px-2 py-1.5"
                      >
                        <div>
                          <span className="font-medium">{r.template_type_label}</span>
                          {r.template_name && (
                            <span className="text-muted-foreground"> · {r.template_name}</span>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Atualizado em{" "}
                            {format(new Date(r.changed_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDismiss(r.id)}
                          aria-label="Dispensar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
